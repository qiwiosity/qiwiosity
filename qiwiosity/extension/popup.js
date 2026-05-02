/**
 * Qiwiosity Extension — Popup Script
 *
 * Manages the extension popup: login/signup, dashboard with stats,
 * and recent wishlist items.
 */

document.addEventListener('DOMContentLoaded', init);

let isSignUp = false;

async function init() {
  // Check if already logged in
  const status = await sendMessage({ action: 'getAuthStatus' });

  if (status?.loggedIn) {
    showDashboard(status.user);
  } else {
    showLogin();
  }

  // Wire up event listeners
  document.getElementById('auth-submit').addEventListener('click', handleAuth);
  document.getElementById('auth-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAuth();
  });
  document.getElementById('toggle-auth-link').addEventListener('click', toggleAuthMode);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

// ── Auth ──────────────────────────────────────────────────

async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  const successEl = document.getElementById('auth-success');
  const btn = document.getElementById('auth-submit');

  errorEl.classList.remove('show');
  successEl.classList.remove('show');

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password';
    errorEl.classList.add('show');
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    errorEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';

  try {
    const action = isSignUp ? 'signup' : 'login';
    const result = await sendMessage({ action, email, password });

    if (result?.error) throw new Error(result.error);

    if (result?.needsConfirmation) {
      successEl.textContent = 'Check your email to confirm your account!';
      successEl.classList.add('show');
      btn.disabled = false;
      btn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
      return;
    }

    if (result?.success) {
      const status = await sendMessage({ action: 'getAuthStatus' });
      showDashboard(status.user);
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
  }
}

function toggleAuthMode() {
  isSignUp = !isSignUp;
  document.getElementById('auth-title').textContent = isSignUp ? 'Create Account' : 'Sign In';
  document.getElementById('auth-submit').textContent = isSignUp ? 'Sign Up' : 'Sign In';
  document.getElementById('toggle-auth').innerHTML = isSignUp
    ? 'Already have an account? <a id="toggle-auth-link">Sign In</a>'
    : 'Don\'t have an account? <a id="toggle-auth-link">Sign Up</a>';
  document.getElementById('toggle-auth-link').addEventListener('click', toggleAuthMode);
  document.getElementById('auth-error').classList.remove('show');
  document.getElementById('auth-success').classList.remove('show');
}

async function handleLogout() {
  await sendMessage({ action: 'logout' });
  showLogin();
}

// ── Views ─────────────────────────────────────────────────

function showLogin() {
  document.getElementById('login-view').classList.add('active');
  document.getElementById('dashboard-view').classList.remove('active');
}

async function showDashboard(user) {
  document.getElementById('login-view').classList.remove('active');
  document.getElementById('dashboard-view').classList.add('active');
  document.getElementById('user-email').textContent = user?.email || '';

  // Load stats
  try {
    const stats = await sendMessage({ action: 'getStats' });
    document.getElementById('stat-total').textContent = stats?.total || 0;
    document.getElementById('stat-visited').textContent = stats?.visited || 0;
    document.getElementById('stat-matched').textContent = stats?.matched_to_poi || 0;
  } catch {
    // silently fail
  }

  // Load recent items
  try {
    const result = await sendMessage({ action: 'getWishlist', page: 1, limit: 5 });
    renderRecentItems(result?.items || []);
  } catch {
    renderRecentItems([]);
  }
}

function renderRecentItems(items) {
  const list = document.getElementById('recent-items');

  if (!items.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128204;</div>
        <p>No saved places yet.<br/>Browse any travel page and click the Qiwiosity button!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map(item => `
    <li data-id="${item.id}">
      ${item.thumbnail_url
        ? `<img class="item-thumb" src="${escapeAttr(item.thumbnail_url)}" alt="" />`
        : `<div class="item-thumb-placeholder">${sourceEmoji(item.source_site)}</div>`
      }
      <div class="item-info">
        <div class="name">${escapeHtml(item.title)}</div>
        <div class="meta">
          ${item.place_name ? escapeHtml(item.place_name) + ' · ' : ''}${escapeHtml(item.source_site)}
          ${item.poi_id ? ' · <span style="color:#0D9488">&#10003; In App</span>' : ''}
        </div>
      </div>
      <button class="item-delete" data-delete="${item.id}" title="Remove">&times;</button>
    </li>
  `).join('');

  // Wire up delete buttons
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.delete;
      await sendMessage({ action: 'deleteItem', id });
      btn.closest('li').remove();

      // Refresh stats
      const stats = await sendMessage({ action: 'getStats' });
      document.getElementById('stat-total').textContent = stats?.total || 0;
    });
  });
}

// ── Helpers ───────────────────────────────────────────────

function sendMessage(msg) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(msg, resolve);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}

function sourceEmoji(site) {
  const map = {
    'youtube': '&#9654;', 'instagram': '&#128247;', 'facebook': '&#128100;',
    'tiktok': '&#9835;', 'google-maps': '&#128205;', 'tripadvisor': '&#127796;',
    'tourism-nz': '&#127475;&#127487;', 'doc-nz': '&#127795;', 'blog': '&#128196;',
  };
  return map[site] || '&#128204;';
}
