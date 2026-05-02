/**
 * Qiwiosity — Site-Specific Place Scrapers
 *
 * Each scraper extracts place information from a specific website.
 * Returns: { title, description, place_name, region, country, lat, lng,
 *            thumbnail_url, tags, source_site, raw_meta }
 */

// eslint-disable-next-line no-var
var QiwiosityScraper = (() => {
  'use strict';

  // ── NZ-specific keyword detection ───────────────────────
  const NZ_REGIONS = [
    'northland', 'auckland', 'waikato', 'bay of plenty', 'gisborne',
    'hawke\'s bay', 'taranaki', 'manawatu', 'whanganui', 'wellington',
    'nelson', 'tasman', 'marlborough', 'west coast', 'canterbury',
    'mackenzie', 'otago', 'queenstown', 'fiordland', 'southland',
    'coromandel', 'rotorua', 'taupo', 'wairarapa', 'kaikoura',
    'abel tasman', 'milford', 'aoraki', 'mount cook', 'tongariro',
    'waiheke', 'stewart island', 'great barrier', 'chatham'
  ];

  const NZ_LANDMARKS = [
    'milford sound', 'tongariro', 'sky tower', 'hobbiton', 'te papa',
    'franz josef', 'fox glacier', 'lake tekapo', 'lake wanaka',
    'queenstown', 'rotorua', 'waitomo', 'bay of islands', 'abel tasman',
    'mt cook', 'mount cook', 'aoraki', 'cape reinga', 'cathedral cove',
    'hot water beach', 'punakaiki', 'pancake rocks', 'wai-o-tapu',
    'geothermal', 'white island', 'whakaari', 'remarkables', 'fiordland',
    'doubtful sound', 'moeraki', 'kaikoura', 'coromandel', 'piha',
    'raglan', 'tane mahuta', 'waipoua', 'tarawera', 'hooker valley',
    'roys peak', 'rob roy', 'routeburn', 'kepler', 'heaphy'
  ];

  function detectNZRegion(text) {
    const lower = text.toLowerCase();
    for (const region of NZ_REGIONS) {
      if (lower.includes(region)) return region.replace(/\b\w/g, c => c.toUpperCase());
    }
    return null;
  }

  function detectNZPlace(text) {
    const lower = text.toLowerCase();
    for (const place of NZ_LANDMARKS) {
      if (lower.includes(place)) return place.replace(/\b\w/g, c => c.toUpperCase());
    }
    return null;
  }

  function isNZRelated(text) {
    const lower = text.toLowerCase();
    return lower.includes('new zealand') || lower.includes('aotearoa') ||
           lower.includes(' nz ') || lower.includes('#nz') ||
           NZ_REGIONS.some(r => lower.includes(r)) ||
           NZ_LANDMARKS.some(l => lower.includes(l));
  }

  // ── Helper: extract meta tags ───────────────────────────
  function getMeta(name) {
    const el = document.querySelector(
      `meta[property="${name}"], meta[name="${name}"], meta[itemprop="${name}"]`
    );
    return el ? el.content?.trim() : null;
  }

  function getLD() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const results = [];
    scripts.forEach(s => {
      try { results.push(JSON.parse(s.textContent)); } catch {}
    });
    return results.flat();
  }

  // ── YouTube ─────────────────────────────────────────────
  function scrapeYouTube() {
    const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent
                  || getMeta('og:title')
                  || document.title;
    const description = document.querySelector('#description-inline-expander yt-attributed-string')?.textContent
                        || getMeta('og:description')
                        || '';
    const channel = document.querySelector('#channel-name a')?.textContent?.trim() || '';
    const thumbnail = getMeta('og:image') || '';

    // Try to extract hashtags
    const hashtagEls = document.querySelectorAll('a.yt-simple-endpoint[href*="/hashtag/"]');
    const tags = [...hashtagEls].map(el => el.textContent.replace('#', '').trim()).filter(Boolean);

    const fullText = `${title} ${description} ${channel}`;
    return {
      title: title?.trim() || document.title,
      description: description.substring(0, 500),
      place_name: detectNZPlace(fullText),
      region: detectNZRegion(fullText),
      country: isNZRelated(fullText) ? 'New Zealand' : null,
      thumbnail_url: thumbnail,
      tags,
      source_site: 'youtube',
      raw_meta: { channel, video_id: new URL(window.location.href).searchParams.get('v') },
    };
  }

  // ── Instagram ───────────────────────────────────────────
  function scrapeInstagram() {
    const title = getMeta('og:title') || document.title;
    const description = getMeta('og:description') || '';
    const thumbnail = getMeta('og:image') || '';

    // Location from the post
    const locationEl = document.querySelector('a[href*="/explore/locations/"]')
                       || document.querySelector('header a[href*="/locations/"]');
    const locationName = locationEl?.textContent?.trim() || null;

    // Hashtags from description
    const hashtagRegex = /#(\w+)/g;
    const combinedText = `${title} ${description}`;
    const tags = [...combinedText.matchAll(hashtagRegex)].map(m => m[1]);

    return {
      title: title?.trim() || 'Instagram Post',
      description: description.substring(0, 500),
      place_name: locationName || detectNZPlace(combinedText),
      region: detectNZRegion(combinedText),
      country: isNZRelated(combinedText) ? 'New Zealand' : null,
      thumbnail_url: thumbnail,
      tags,
      source_site: 'instagram',
      raw_meta: { location_tag: locationName },
    };
  }

  // ── Facebook ────────────────────────────────────────────
  function scrapeFacebook() {
    const title = getMeta('og:title') || document.title;
    const description = getMeta('og:description') || '';
    const thumbnail = getMeta('og:image') || '';

    // Check-in / location
    const locationEl = document.querySelector('a[href*="/pages/"]')
                       || document.querySelector('[data-testid="story-subtitle"] a');
    const locationName = locationEl?.textContent?.trim() || null;

    const fullText = `${title} ${description} ${locationName || ''}`;
    const tags = [...fullText.matchAll(/#(\w+)/g)].map(m => m[1]);

    return {
      title: title?.trim() || 'Facebook Post',
      description: description.substring(0, 500),
      place_name: locationName || detectNZPlace(fullText),
      region: detectNZRegion(fullText),
      country: isNZRelated(fullText) ? 'New Zealand' : null,
      thumbnail_url: thumbnail,
      tags,
      source_site: 'facebook',
      raw_meta: { location_tag: locationName },
    };
  }

  // ── Google Maps ─────────────────────────────────────────
  function scrapeGoogleMaps() {
    // Title is usually the place name
    const titleEl = document.querySelector('h1.DUwDvf, h1[data-attrid]')
                    || document.querySelector('div.fontHeadlineLarge');
    const title = titleEl?.textContent?.trim() || getMeta('og:title') || document.title;

    // Rating
    const ratingEl = document.querySelector('span.ceNzKf, div.F7nice span[aria-hidden]');
    const rating = ratingEl?.textContent?.trim() || null;

    // Address
    const addressEl = document.querySelector('button[data-item-id="address"] div.fontBodyMedium')
                      || document.querySelector('[data-tooltip="Copy address"]');
    const address = addressEl?.textContent?.trim() || null;

    // Category
    const categoryEl = document.querySelector('button.DkEaL');
    const category = categoryEl?.textContent?.trim() || null;

    // Try to get lat/lng from URL
    let lat = null, lng = null;
    const urlMatch = window.location.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (urlMatch) {
      lat = parseFloat(urlMatch[1]);
      lng = parseFloat(urlMatch[2]);
    }

    // Thumbnail from og:image
    const thumbnail = getMeta('og:image') || '';

    const fullText = `${title} ${address || ''} ${category || ''}`;

    return {
      title,
      description: [category, address, rating ? `${rating} stars` : null].filter(Boolean).join(' — '),
      place_name: title,
      region: detectNZRegion(fullText),
      country: isNZRelated(fullText) ? 'New Zealand' : detectCountryFromAddress(address),
      lat,
      lng,
      thumbnail_url: thumbnail,
      tags: category ? [category.toLowerCase()] : [],
      source_site: 'google-maps',
      raw_meta: { address, rating, category, maps_url: window.location.href },
    };
  }

  // ── TripAdvisor ─────────────────────────────────────────
  function scrapeTripAdvisor() {
    const title = document.querySelector('h1')?.textContent?.trim()
                  || getMeta('og:title')
                  || document.title;
    const description = getMeta('og:description') || '';
    const thumbnail = getMeta('og:image') || '';

    // Rating
    const ratingEl = document.querySelector('[data-automation="reviewCount"]')
                     || document.querySelector('.biGQs');
    const rating = ratingEl?.textContent?.trim() || null;

    // Address
    const addressEl = document.querySelector('[data-automation="address"]')
                      || document.querySelector('.fHibz');
    const address = addressEl?.textContent?.trim() || null;

    // LD+JSON often has coordinates
    let lat = null, lng = null;
    const ldData = getLD();
    for (const ld of ldData) {
      if (ld.geo) {
        lat = parseFloat(ld.geo.latitude);
        lng = parseFloat(ld.geo.longitude);
      }
      if (ld.address?.addressCountry) {
        // good to have
      }
    }

    const fullText = `${title} ${description} ${address || ''}`;

    return {
      title,
      description: description.substring(0, 500),
      place_name: title,
      region: detectNZRegion(fullText),
      country: isNZRelated(fullText) ? 'New Zealand' : null,
      lat,
      lng,
      thumbnail_url: thumbnail,
      tags: [],
      source_site: 'tripadvisor',
      raw_meta: { address, rating },
    };
  }

  // ── TikTok ──────────────────────────────────────────────
  function scrapeTikTok() {
    const title = getMeta('og:title') || document.title;
    const description = getMeta('og:description') || '';
    const thumbnail = getMeta('og:image') || '';

    const fullText = `${title} ${description}`;
    const tags = [...fullText.matchAll(/#(\w+)/g)].map(m => m[1]);

    return {
      title: title?.trim() || 'TikTok Video',
      description: description.substring(0, 500),
      place_name: detectNZPlace(fullText),
      region: detectNZRegion(fullText),
      country: isNZRelated(fullText) ? 'New Zealand' : null,
      thumbnail_url: thumbnail,
      tags,
      source_site: 'tiktok',
      raw_meta: {},
    };
  }

  // ── Tourism NZ / DOC ───────────────────────────────────
  function scrapeNZOfficial() {
    const title = document.querySelector('h1')?.textContent?.trim()
                  || getMeta('og:title')
                  || document.title;
    const description = getMeta('og:description')
                        || document.querySelector('meta[name="description"]')?.content
                        || '';
    const thumbnail = getMeta('og:image') || '';

    // These sites often have structured data
    let lat = null, lng = null;
    const ldData = getLD();
    for (const ld of ldData) {
      if (ld.geo) { lat = parseFloat(ld.geo.latitude); lng = parseFloat(ld.geo.longitude); }
    }

    const fullText = `${title} ${description}`;

    return {
      title,
      description: description.substring(0, 500),
      place_name: detectNZPlace(fullText) || title,
      region: detectNZRegion(fullText),
      country: 'New Zealand',
      lat,
      lng,
      thumbnail_url: thumbnail,
      tags: [],
      source_site: window.location.hostname.includes('doc.govt') ? 'doc-nz' : 'tourism-nz',
      raw_meta: {},
    };
  }

  // ── Generic / Blog ──────────────────────────────────────
  function scrapeGeneric() {
    const title = document.querySelector('h1')?.textContent?.trim()
                  || getMeta('og:title')
                  || document.title;
    const description = getMeta('og:description')
                        || getMeta('description')
                        || '';
    const thumbnail = getMeta('og:image') || '';

    // Try LD+JSON for location
    let lat = null, lng = null, placeName = null;
    const ldData = getLD();
    for (const ld of ldData) {
      if (ld.geo) { lat = parseFloat(ld.geo.latitude); lng = parseFloat(ld.geo.longitude); }
      if (ld.name && ld['@type']?.includes?.('Place')) { placeName = ld.name; }
      if (ld.address?.addressLocality) { placeName = placeName || ld.address.addressLocality; }
    }

    const fullText = `${title} ${description}`;

    return {
      title: title?.trim() || document.title,
      description: description.substring(0, 500),
      place_name: placeName || detectNZPlace(fullText),
      region: detectNZRegion(fullText),
      country: isNZRelated(fullText) ? 'New Zealand' : null,
      lat,
      lng,
      thumbnail_url: thumbnail,
      tags: [],
      source_site: 'blog',
      raw_meta: {},
    };
  }

  // ── Helpers ─────────────────────────────────────────────

  function detectCountryFromAddress(address) {
    if (!address) return null;
    const lower = address.toLowerCase();
    if (lower.includes('new zealand') || lower.includes('nz')) return 'New Zealand';
    return null;
  }

  // ── Router ──────────────────────────────────────────────
  function scrape() {
    const host = window.location.hostname.toLowerCase();

    if (host.includes('youtube') || host.includes('youtu.be')) return scrapeYouTube();
    if (host.includes('instagram')) return scrapeInstagram();
    if (host.includes('facebook') || host.includes('fb.com')) return scrapeFacebook();
    if (host.includes('google') && (host.includes('maps') || window.location.pathname.startsWith('/maps'))) return scrapeGoogleMaps();
    if (host.includes('tripadvisor')) return scrapeTripAdvisor();
    if (host.includes('tiktok')) return scrapeTikTok();
    if (host.includes('newzealand.com') || host.includes('doc.govt.nz')) return scrapeNZOfficial();

    return scrapeGeneric();
  }

  return { scrape, isNZRelated, detectNZPlace, detectNZRegion };
})();
