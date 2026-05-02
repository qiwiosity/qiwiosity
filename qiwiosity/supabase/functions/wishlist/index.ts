/**
 * Qiwiosity Wishlist Edge Function
 *
 * Handles all wishlist CRUD operations.
 * Used by both the Chrome extension and the mobile app.
 *
 * Endpoints (via method + path):
 *   GET    /wishlist              — List user's wishlist items
 *   POST   /wishlist              — Add new wishlist item
 *   PATCH  /wishlist/:id          — Update wishlist item
 *   DELETE /wishlist/:id          — Delete wishlist item
 *   GET    /wishlist/stats        — Wishlist statistics
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with the user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // pathParts: ['wishlist'] or ['wishlist', ':id'] or ['wishlist', 'stats']

    const method = req.method;
    const itemId = pathParts.length > 1 ? pathParts[1] : null;

    // ── GET /wishlist/stats ──────────────────────────────
    if (method === 'GET' && itemId === 'stats') {
      const { count: total } = await supabase
        .from('wishlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: visited } = await supabase
        .from('wishlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_visited', true);

      const { count: matched } = await supabase
        .from('wishlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('poi_id', 'is', null);

      const { data: sourceCounts } = await supabase
        .from('wishlist_items')
        .select('source_site')
        .eq('user_id', user.id);

      const bySite: Record<string, number> = {};
      sourceCounts?.forEach((row: any) => {
        bySite[row.source_site] = (bySite[row.source_site] || 0) + 1;
      });

      return jsonResponse({
        total: total || 0,
        visited: visited || 0,
        unvisited: (total || 0) - (visited || 0),
        matched_to_poi: matched || 0,
        by_source: bySite,
      });
    }

    // ── GET /wishlist ────────────────────────────────────
    if (method === 'GET' && !itemId) {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;
      const source = url.searchParams.get('source');
      const visited = url.searchParams.get('visited');
      const search = url.searchParams.get('q');

      let query = supabase
        .from('wishlist_full')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (source) query = query.eq('source_site', source);
      if (visited === 'true') query = query.eq('is_visited', true);
      if (visited === 'false') query = query.eq('is_visited', false);
      if (search) query = query.or(`title.ilike.%${search}%,place_name.ilike.%${search}%,description.ilike.%${search}%`);

      const { data, error, count } = await query;
      if (error) return jsonResponse({ error: error.message }, 400);

      return jsonResponse({
        items: data,
        total: count,
        page,
        limit,
        has_more: (count || 0) > offset + limit,
      });
    }

    // ── POST /wishlist ───────────────────────────────────
    if (method === 'POST') {
      const body = await req.json();

      const item = {
        user_id: user.id,
        title: body.title,
        url: body.url,
        source_site: body.source_site || detectSourceSite(body.url),
        thumbnail_url: body.thumbnail_url || null,
        description: body.description || null,
        place_name: body.place_name || null,
        country: body.country || 'New Zealand',
        region: body.region || null,
        lat: body.lat || null,
        lng: body.lng || null,
        tags: body.tags || [],
        notes: body.notes || null,
        saved_from: body.saved_from || 'extension',
        raw_meta: body.raw_meta || {},
      };

      if (!item.title || !item.url) {
        return jsonResponse({ error: 'title and url are required' }, 400);
      }

      // Check for duplicate URL
      const { data: existing } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('url', item.url)
        .limit(1);

      if (existing && existing.length > 0) {
        return jsonResponse({
          error: 'Already in your wishlist',
          existing_id: existing[0].id,
        }, 409);
      }

      const { data, error } = await supabase
        .from('wishlist_items')
        .insert(item)
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);

      return jsonResponse({ item: data }, 201);
    }

    // ── PATCH /wishlist/:id ──────────────────────────────
    if (method === 'PATCH' && itemId) {
      const body = await req.json();

      // Only allow updating specific fields
      const allowed = ['title', 'place_name', 'country', 'region', 'lat', 'lng',
                       'tags', 'notes', 'is_visited', 'visited_at', 'description', 'thumbnail_url'];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (key in body) updates[key] = body[key];
      }

      // Auto-set visited_at when marking as visited
      if (updates.is_visited === true && !updates.visited_at) {
        updates.visited_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('wishlist_items')
        .update(updates)
        .eq('id', itemId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);
      if (!data) return jsonResponse({ error: 'Not found' }, 404);

      return jsonResponse({ item: data });
    }

    // ── DELETE /wishlist/:id ─────────────────────────────
    if (method === 'DELETE' && itemId) {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ deleted: true });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (err) {
    return jsonResponse({ error: 'Internal server error', details: String(err) }, 500);
  }
});

// ── Helpers ────────────────────────────────────────────────

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function detectSourceSite(url: string): string {
  if (!url) return 'unknown';
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes('youtube') || host.includes('youtu.be')) return 'youtube';
  if (host.includes('instagram')) return 'instagram';
  if (host.includes('facebook') || host.includes('fb.com')) return 'facebook';
  if (host.includes('tiktok')) return 'tiktok';
  if (host.includes('tripadvisor')) return 'tripadvisor';
  if (host.includes('google') && host.includes('maps')) return 'google-maps';
  if (host.includes('booking.com')) return 'booking';
  if (host.includes('airbnb')) return 'airbnb';
  if (host.includes('newzealand.com')) return 'tourism-nz';
  if (host.includes('doc.govt.nz')) return 'doc-nz';
  return 'blog';
}
