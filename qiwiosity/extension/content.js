/**
 * Qiwiosity Content Script
 *
 * Injects a floating "Save to Qiwiosity" button on every page.
 * When clicked, scrapes the current page for place info and
 * shows a confirm/edit panel before saving to the API.
 */

(() => {
  'use strict';

  // Avoid double-injection
  if (document.getElementById('qiwiosity-fab')) return;

  let panelOpen = false;
  let currentData = null;

  // ── Kiwi icon SVG ─────────────────────────────────────
  const KIWI_SVG = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5v-2.09c-1.77-.33-3.14-1.59-3.61-3.27l1.92-.53c.29 1.04 1.15 1.8 2.19 2.01V10.5l-.63-.17C9.26 9.88 8 8.66 8 7.14 8 5.41 9.42 4 11.15 4H11v1.5c1.58.29 2.78 1.47 3.1 3l-1.94.49C11.88 7.84 11.19 7.14 10.5 7V10l.65.18C12.83 10.62 14 11.84 14 13.36c0 1.73-1.42 3.14-3.15 3.14H11z"/>
      <circle cx="12" cy="7.5" r="1" fill="white"/>
    </svg>`;

  // Simplified pin/bookmark icon
  const BOOKMARK_SVG = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" fill="white"/>
      <path d="M11 7h2v2h2v2h-2v2h-2v-2H9V9h2V7z" fill="white"/>
    </svg>`;

  // ── Create FAB ────────────────────────────────────────
  const fab = document.createElement('button');
  fab.id = 'qiwiosity-fab';
  fab.title = 'Save to Qiwiosity';
  fab.innerHTML = BOOKMARK_SVG;
  document.body.appendChild(fab);

  // ── Create Panel ──────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'qiwiosity-panel';
  document.body.appendChild(panel);

  // ── FAB Click ─────────────────────────────────────────
  fab.addEventListener('click', async () => {
    if (panelOpen) {
      closePanel();
      return;
    }

    // Check auth status
    const authStatus = await sendMessage({ action: 'getAuthStatus' });

    if (!authStatus?.loggedIn) {
      openPanel(renderLoginPrompt());
      return;
    }

    // Scrape the page
    currentData = QiwiosityScraper.scrape();
    currentData.url = window.location.href;

    openPanel(renderSaveForm(currentData));
  });

  // ── Panel Helpers ─────────────────────────────────────
  function openPanel(html) {
    panel.innerHTML = html;
    panelOpen = true;
    requestAnimationFrame(() => panel.classList.add('qiwiosity-visible'));
    attachPanelListeners();
  }

  function closePanel() {
    panel.classList.remove('qiwiosity-visible');
    panelOpen = false;
    setTimeout(() => { panel.innerHTML = ''; }, 300);
  }

  // ── Render: Login Prompt ──────────────────────────────
  function renderLoginPrompt() {
    return `
      <div class="qiwiosity-header">
        <h3>Save to Qiwiosity</h3>
        <button class="qiwiosity-close" data-action="close">&times;</button>
      </div>
      <div class="qiwiosity-login">
        <p>Sign in to save places to your Qiwiosity wishlist</p>
        <button class="qiwiosity-login-btn" data-action="login">Sign In</button>
      </div>
    `;
  }

  // ── Render: Save Form ─────────────────────────────────
  function renderSaveForm(data) {
    const thumbHtml = data.thumbnail_url
      ? `<img class="qiwiosity-thumb" src="${escapeAttr(data.thumbnail_url)}" alt="" />`
      : `<div class="qiwiosity-thumb-placeholder">No preview available</div>`;

    const nzMatchHtml = data.place_name || data.region
      ? `<div class="qiwiosity-nz-match">
           <span>&#127475;&#127487;</span>
           Detected: <strong>${escapeHtml(data.place_name || '')}${data.region ? `, ${escapeHtml(data.region)}` : ''}</strong>
         </div>`
      : '';

    const tagsHtml = data.tags?.length
      ? `<div class="qiwiosity-tags">${data.tags.slice(0, 6).map(t => `<span class="qiwiosity-tag">#${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    return `
      <div class="qiwiosity-header">
        <h3>Save to Qiwiosity</h3>
        <button class="qiwiosity-close" data-action="close">&times;</button>
      </div>
      <div class="qiwiosity-body">
        ${thumbHtml}

        <div class="qiwiosity-source">
          <span>${sourceIcon(data.source_site)}</span>
          ${escapeHtml(data.source_site)}
        </div>

        ${nzMatchHtml}

        <div class="qiwiosity-field">
          <label>Title</label>
          <input type="text" id="qiwiosity-title" value="${escapeAttr(data.title || '')}" />
        </div>

        <div class="qiwiosity-field">
          <label>Place Name</label>
          <input type="text" id="qiwiosity-place" value="${escapeAttr(data.place_name || '')}" placeholder="e.g. Milford Sound" />
        </div>

        <div class="qiwiosity-field">
          <label>Region</label>
          <input type="text" id="qiwiosity-region" value="${escapeAttr(data.region || '')}" placeholder="e.g. Fiordland" />
        </div>

        <div class="qiwiosity-field">
          <label>Notes (optional)</label>
          <textarea id="qiwiosity-notes" placeholder="Why do you want to visit?"></textarea>
        </div>

        ${tagsHtml}

        <button class="qiwiosity-save-btn" id="qiwiosity-save" data-action="save">
          Save to Wishlist
        </button>
        <div id="qiwiosity-status"></div>
      </div>
    `;
  }

  // ── Attach panel event listeners ──────────────────────
  function attachPanelListeners() {
    panel.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', async (e) => {
        const action = e.currentTarget.dataset.action;

        if (action === 'close') {
          closePanel();
        }

        if (action === 'login') {
          sendMessage({ action: 'openLogin' });
          closePanel();
        }

        if (action === 'save') {
          await handleSave();
        }
      });
    });
  }

  // ── Save Handler ──────────────────────────────────────
  async function handleSave() {
    const btn = document.getElementById('qiwiosity-save');
    const statusEl = document.getElementById('qiwiosity-status');

    btn.disabled = true;
    btn.textContent = 'Saving...';

    // Read edited fields
    const payload = {
      ...currentData,
      title: document.getElementById('qiwiosity-title')?.value || currentData.title,
      place_name: document.getElementById('qiwiosity-place')?.value || currentData.place_name,
      region: document.getElementById('qiwiosity-region')?.value || currentData.region,
      notes: document.getElementById('qiwiosity-notes')?.value || null,
    };

    try {
      const result = await sendMessage({ action: 'saveToWishlist', data: payload });

      if (result?.success) {
        btn.textContent = 'Saved!';
        btn.classList.add('qiwiosity-saved');
        statusEl.className = 'qiwiosity-status success';
        statusEl.textContent = result.matched_poi
          ? `Matched to Qiwiosity POI: ${result.matched_poi}`
          : 'Added to your wishlist!';

        // Close panel after a moment
        setTimeout(closePanel, 2000);
      } else if (result?.error === 'Already in your wishlist') {
        btn.textContent = 'Already Saved';
        btn.classList.add('qiwiosity-saved');
        statusEl.className = 'qiwiosity-status success';
        statusEl.textContent = 'This is already in your wishlist';
        setTimeout(closePanel, 2000);
      } else {
        throw new Error(result?.error || 'Save failed');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Save to Wishlist';
      statusEl.className = 'qiwiosity-status error';
      statusEl.textContent = err.message || 'Something went wrong. Try again.';
    }
  }

  // ── Communication with background script ──────────────
  function sendMessage(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (response) => {
        resolve(response);
      });
    });
  }

  // ── Utility ───────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function sourceIcon(site) {
    const icons = {
      'youtube': '&#9654;',
      'instagram': '&#128247;',
      'facebook': '&#128100;',
      'tiktok': '&#9835;',
      'google-maps': '&#128205;',
      'tripadvisor': '&#127796;',
      'tourism-nz': '&#127475;&#127487;',
      'doc-nz': '&#127795;',
      'blog': '&#128196;',
    };
    return icons[site] || '&#127757;';
  }

  // ── Click outside to close ────────────────────────────
  document.addEventListener('click', (e) => {
    if (panelOpen && !panel.contains(e.target) && e.target !== fab) {
      closePanel();
    }
  });

  // ── Keyboard shortcut: Alt+Q ──────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'q') {
      fab.click();
    }
  });
})();
