/**
 * Qiwiosity Extension — Background Service Worker
 *
 * Handles:
 *  - Auth (Supabase login/session via chrome.storage)
 *  - API calls to Supabase Edge Function
 *  - Message routing from content scripts
 */

// ── Configuration ─────────────────────────────────────────
// IMPORTANT: Replace these with your actual Supabase project values
const CONFIG = {
  SUPABASE_URL: 'https://osulujkdeuukilchfath.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdWx1amtkZXV1a2lsY2hmYXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDc0MTcsImV4cCI6MjA5MzgyMzQxN30.Ery8n0yWMgRINn4MTSkW1tTv7t8oRZU9LTUuGiMmXiU',
  WISHLIST_FUNCTION_URL: 'https://osulujkdeuukilchfath.supabase.co/functions/v1/wishlist',
};

// ── Auth State ──────────���─────────────────────────────────

async function getSession() {
  const result = await chrome.storage.local.get(['qiwiosity_session']);
  return result.qiwiosity_session || null;
}

async function setSession(session) {
  await chrome.storage.local.set({ qiwiosity_session: session });
}

async function clearSession() {
  await chrome.storage.local.remove(['qiwiosity_session']);
}

async function refreshToken(session) {
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    const newSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      user: data.user,
    };
    await setSession(newSession);
    return newSession;
  } catch {
    await clearSession();
    return null;
  }
}

async function getValidSession() {
  let session = await getSession();
  if (!session) return null;

  // Refresh if token expires in < 5 minutes
  if (session.expires_at && Date.now() > session.expires_at - 300000) {
    session = await refreshToken(session);
  }
  return session;
}

// ── API Calls ───────────���─────────────────────────────────

async function apiCall(method, path = '', body = null) {
  const session = await getValidSession();
  if (!session) throw new Error('Not authenticated');

  const url = path ? `${CONFIG.WISHLIST_FUNCTION_URL}/${path}` : CONFIG.WISHLIST_FUNCTION_URL;

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': CONFIG.SUPABASE_ANON_KEY,
    },
  };

  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

// ── Login Flow ────────────────────────────────────────────

async function loginWithEmail(email, password) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': CONFIG.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || err.msg || 'Login failed');
  }

  const data = await res.json();
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    user: data.user,
  };
  await setSession(session);
  return session;
}

async function signUpWithEmail(email, password) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': CONFIG.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || err.msg || 'Signup failed');
  }

  const data = await res.json();
  if (data.access_token) {
    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      user: data.user,
    };
    await setSession(session);
    return session;
  }
  return { needsConfirmation: true };
}

// ── Message Handler ───────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => {
    sendResponse({ error: err.message });
  });
  return true; // Async response
});

async function handleMessage(msg) {
  switch (msg.action) {

    case 'getAuthStatus': {
      const session = await getValidSession();
      return {
        loggedIn: !!session,
        user: session?.user || null,
      };
    }

    case 'login': {
      const session = await loginWithEmail(msg.email, msg.password);
      return { success: true, user: session.user };
    }

    case 'signup': {
      const result = await signUpWithEmail(msg.email, msg.password);
      if (result.needsConfirmation) {
        return { success: true, needsConfirmation: true };
      }
      return { success: true, user: result.user };
    }

    case 'logout': {
      await clearSession();
      return { success: true };
    }

    case 'openLogin': {
      // Open the popup for login
      chrome.action.openPopup?.() || chrome.action.setBadgeText({ text: '!' });
      return { success: true };
    }

    case 'saveToWishlist': {
      const result = await apiCall('POST', '', {
        title: msg.data.title,
        url: msg.data.url,
        source_site: msg.data.source_site,
        thumbnail_url: msg.data.thumbnail_url,
        description: msg.data.description,
        place_name: msg.data.place_name,
        country: msg.data.country,
        region: msg.data.region,
        lat: msg.data.lat,
        lng: msg.data.lng,
        tags: msg.data.tags,
        notes: msg.data.notes,
        saved_from: 'extension',
        raw_meta: msg.data.raw_meta,
      });

      // Update badge count
      updateBadge();

      return {
        success: true,
        item: result.item,
        matched_poi: result.item?.poi_id ? result.item.place_name : null,
      };
    }

    case 'getWishlist': {
      return await apiCall('GET', `?page=${msg.page || 1}&limit=${msg.limit || 20}`);
    }

    case 'getStats': {
      return await apiCall('GET', 'stats');
    }

    case 'deleteItem': {
      return await apiCall('DELETE', msg.id);
    }

    case 'toggleVisited': {
      return await apiCall('PATCH', msg.id, { is_visited: msg.visited });
    }

    default:
      return { error: 'Unknown action' };
  }
}

// ── Badge ���────────────────────────────────────────────────

async function updateBadge() {
  try {
    const stats = await apiCall('GET', 'stats');
    const count = stats.total || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#0D9488' });
  } catch {
    // Not logged in — no badge
    chrome.action.setBadgeText({ text: '' });
  }
}

// Update badge on startup
updateBadge();

// Refresh badge periodically
chrome.alarms?.create('refreshBadge', { periodInMinutes: 5 });
chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshBadge') updateBadge();
});
