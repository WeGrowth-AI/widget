(() => {
  const SCOPE_OK = /(^|\.)skool\.com$/i.test(location.hostname);
  if (!SCOPE_OK) return;

  let root, panel, fab, chatListEl, inputEl, counterEl;
  let session = null;
  let messageCount = 0;
  let initialGreetingShown = false;
  let selectedModule = 'Introduction to Digital Marketing';
  const EDGE_MARGIN = 18;
  let isDragging = false;
  let dragMoved = false;

  function ensureMounted() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'la-root';
    document.documentElement.appendChild(root);

    // Floating button
    fab = document.createElement('button');
    fab.className = 'la-fab';
    fab.title = 'Learning Assistant';
    fab.setAttribute('aria-label', 'Open Learning Assistant');
    fab.innerHTML = '';
    fab.addEventListener('click', onFabClick);
    root.appendChild(fab);

    setupFabDrag();

    // Panel
    panel = document.createElement('div');
    panel.className = 'la-panel';
    panel.innerHTML = `
      <div class="la-header">
        <div class="la-logo">AI</div>
        <div class="la-head-main">
          <div class="la-title">Learning Assistant</div>
          <div class="la-subrow">
            <span class="la-badge with-icon"><span class="ico user-ico" aria-hidden="true"></span> <span id="la-tier-label">Free Tier</span></span>
            <span class="la-counter" id="la-counter">7/10 messages</span>
          </div>
        </div>
        <button class="la-close" id="la-close" aria-label="Close">✕</button>
      </div>

      <div class="la-locked" id="la-locked" aria-hidden="true">
        <div class="la-locked-card">
          <div class="la-locked-title">Sign in to use the assistant</div>
          <div class="la-locked-desc">Open the extension popup and complete login. Then return here.</div>
        </div>
      </div>

      <div class="la-section">
        <details class="la-accordion" id="la-module-accordion">
          <summary>
            <span class="la-sum-left"><span class="la-sum-icon">📚</span> <span>Select Module</span></span>
            <span class="la-sum-caret"></span>
          </summary>
          <div class="la-card la-accordion-content">
            <div class="la-module-list" id="la-module-list" role="listbox" aria-label="Select Module">
              <div class="la-module-item selected" role="option" data-value="Introduction to Digital Marketing">
                <div class="opt-title">Introduction to Digital Marketing</div>
                <div class="opt-desc">Learn the fundamentals of digital marketing</div>
              </div>
              <div class="la-module-item" role="option" data-value="Social Media Strategy">
                <div class="opt-title">Social Media Strategy</div>
                <div class="opt-desc">Master social media marketing techniques</div>
              </div>
              <div class="la-module-item" role="option" data-value="Content Creation">
                <div class="opt-title">Content Creation</div>
                <div class="opt-desc">Create engaging content that converts</div>
              </div>
              <div class="la-module-item" role="option" data-value="Email Marketing">
                <div class="opt-title">Email Marketing</div>
                <div class="opt-desc">Build effective email campaigns</div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div class="la-chat" id="la-chat"></div>

      <div class="la-input-row">
        <input id="la-input" class="la-input" placeholder="Ask me anything about the course..." />
        <button id="la-send" class="la-send" aria-label="Send"></button>
      </div>

      <div class="la-upgrade">
        <div class="la-upgrade-title">Unlock unlimited access</div>
        <button class="cta">UPGRADE</button>
      </div>
    `;
    root.appendChild(panel);

    chatListEl = panel.querySelector('#la-chat');
    inputEl = panel.querySelector('#la-input');
    counterEl = panel.querySelector('#la-counter');
    panel.querySelector('#la-send').addEventListener('click', onSend);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend(); });
    panel.querySelector('#la-close').addEventListener('click', () => {
      panel.classList.remove('open');
      updateFabVisibility();
    });

    setupModuleList();

    maybeShowInitialGreeting();
  }

  function togglePanel() {
    ensureMounted();
    panel.classList.toggle('open');
    updateFabVisibility();
  }

  function onFabClick(e) {
    // Ignore click if a drag just occurred
    if (dragMoved) {
      dragMoved = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    togglePanel();
  }

  function appendMessage(text, role) {
    const row = document.createElement('div');
    row.className = `la-msg-row ${role}`;
    if (role === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = 'la-avatar la-avatar-bot';
      avatar.setAttribute('aria-label', 'AI assistant');
      row.appendChild(avatar);
    }
    const bubbleWrap = document.createElement('div');
    const item = document.createElement('div');
    item.className = `la-msg ${role}`;
    item.textContent = text;
    const time = document.createElement('div');
    time.className = 'la-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubbleWrap.appendChild(item);
    bubbleWrap.appendChild(time);
    row.appendChild(bubbleWrap);
    chatListEl.appendChild(row);
    chatListEl.scrollTop = chatListEl.scrollHeight;
  }

  async function onSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    appendMessage(text, 'user');
    messageCount += 1;
    updateCounter();
    // Backend chat
    try {
      const token = session?.token;
      const organizationId = session?.user?.organizationId || null;
      if (!token || !organizationId) throw new Error('Not authenticated');
      const res = await chrome.runtime.sendMessage({ type: 'LA_CHAT_REQUEST', token, organizationId, text });
      if (res?.ok && res.data) {
        const reply = (res.data && (res.data.reply || res.data.message || res.data.text)) || "";
        appendMessage(String(reply || '...'), 'bot');
      } else {
        appendMessage('There was a problem contacting the assistant. Please try again.', 'bot');
      }
    } catch (e) {
      appendMessage('Please sign in via the extension popup to chat.', 'bot');
    }
  }

  function isAuthenticated() {
    return !!(session && session.token && session.validated && session.source === 'supabase');
  }

  function maybeShowInitialGreeting() {
    if (initialGreetingShown || !chatListEl) return;
    if (!isAuthenticated()) return;
    appendMessage("Hi! I'm your AI learning assistant. Select a module to get started, or ask me any questions about your course content.", 'bot');
    initialGreetingShown = true;
  }

  function updateCounter() {
    if (!counterEl) return;
    const remaining = Math.max(0, 10 - messageCount);
    counterEl.textContent = `${remaining}/10 messages`;
  }

  function setupModuleList() {
    const list = panel.querySelector('#la-module-list');
    if (!list) return;
    list.addEventListener('click', (e) => {
      const item = e.target.closest('.la-module-item[role="option"]');
      if (!item) return;
      list.querySelectorAll('.la-module-item').forEach(x => x.classList.remove('selected'));
      item.classList.add('selected');
      selectedModule = item.dataset.value || item.textContent.trim();
    });
  }

  function applyStylesheet() {
    // Inject stylesheet via document for simplicity; resource is declared in web_accessible_resources
    const href = chrome.runtime.getURL('src/content/inject.css');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.documentElement.appendChild(link);
  }

  function isPanelOpen() {
    return !!panel && panel.classList.contains('open');
  }

  function updateFabVisibility() {
    if (!fab) return;
    if (isPanelOpen()) {
      fab.classList.add('hidden');
    } else {
      fab.classList.remove('hidden');
    }
  }

  // --- Theme detection & syncing with skool.com ---
  function getPageThemePreference() {
    const html = document.documentElement;
    const body = document.body;

    function attr(el, name) {
      try { return (el && el.getAttribute && el.getAttribute(name)) || ''; } catch { return ''; }
    }
    function hasClassLike(el, token) {
      if (!el || !el.classList) return false;
      const t = token.toLowerCase();
      for (const cls of el.classList) {
        if (cls.toLowerCase() === t || cls.toLowerCase().includes(t)) return true;
      }
      return false;
    }

    const attrVals = [
      attr(html, 'data-theme'), attr(body, 'data-theme'),
      attr(html, 'theme'), attr(body, 'theme'),
      attr(html, 'color-scheme'), attr(body, 'color-scheme')
    ].map(v => (v || '').toLowerCase());

    if (attrVals.some(v => v.includes('dark'))) return 'dark';
    if (attrVals.some(v => v.includes('light'))) return 'light';

    if (hasClassLike(html, 'theme-dark') || hasClassLike(body, 'theme-dark') || hasClassLike(html, 'dark') || hasClassLike(body, 'dark')) return 'dark';
    if (hasClassLike(html, 'theme-light') || hasClassLike(body, 'theme-light') || hasClassLike(html, 'light') || hasClassLike(body, 'light')) return 'light';

    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta && typeof meta.content === 'string') {
      const c = meta.content.toLowerCase();
      if (c.includes('dark') && !c.includes('light')) return 'dark';
      if (c.includes('light') && !c.includes('dark')) return 'light';
    }

    // Fallback 1: system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Fallback 2: compute background luminance of body/html
    const bgTheme = (() => {
      function parseRgb(str) {
        if (!str) return null;
        const m = str.match(/rgba?\(([^)]+)\)/i);
        if (!m) return null;
        const parts = m[1].split(',').map(s => s.trim());
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
        if ([r,g,b].some(v => Number.isNaN(v))) return null;
        return { r, g, b, a: Number.isNaN(a) ? 1 : a };
      }
      function relLum({ r, g, b }) {
        function toLinear(u) {
          u = u / 255;
          return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
        }
        const R = toLinear(r), G = toLinear(g), B = toLinear(b);
        return 0.2126 * R + 0.7152 * G + 0.0722 * B;
      }
      function getBg(el) {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        const rgb = parseRgb(cs && cs.backgroundColor);
        if (!rgb) return null;
        if (rgb.a === 0) return null; // fully transparent
        return rgb;
      }
      const order = [body, html];
      for (const el of order) {
        const rgb = getBg(el);
        if (rgb) {
          const L = relLum(rgb);
          return L >= 0.45 ? 'light' : 'dark';
        }
      }
      return null;
    })();

    if (bgTheme) return bgTheme;
    return prefersDark ? 'dark' : 'light';
  }

  function applyThemeClass(theme) {
    if (!root) return;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
  }

  function setupThemeSync() {
    let rafId = 0;
    const update = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => applyThemeClass('dark'));
    };
    update();

    const attrFilter = ['class', 'data-theme', 'theme', 'style'];
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && attrFilter.includes(m.attributeName)) { update(); break; }
        if (m.type === 'childList') { update(); break; }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: attrFilter, childList: true, subtree: false });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: attrFilter, childList: false, subtree: false });
    } else {
      const waitBody = new MutationObserver(() => {
        if (document.body) {
          observer.observe(document.body, { attributes: true, attributeFilter: attrFilter });
          waitBody.disconnect();
          update();
        }
      });
      waitBody.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Ignore system preference changes; always stay dark

    // Periodic re-check in case the site toggles theme via CSS variables only
    // No periodic re-check needed as we force dark mode
  }

  function setupFabDrag() {
    if (!fab) return;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    const thresholdSq = 9; // ~3px movement
    let movedSq = 0;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function onPointerDown(e) {
      if (isPanelOpen()) return; // Do not allow dragging while panel is open
      if (e.button !== undefined && e.button !== 0) return;
      isDragging = true;
      dragMoved = false;
      movedSq = 0;
      fab.classList.add('dragging');
      fab.style.transition = 'none';
      fab.style.transform = 'none';

      const rect = fab.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      // Switch to left/top positioning for the drag
      fab.style.left = `${startLeft}px`;
      fab.style.top = `${startTop}px`;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';

      try { fab.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      movedSq = dx * dx + dy * dy;
      if (movedSq > thresholdSq) dragMoved = true;

      const maxLeft = window.innerWidth - fab.offsetWidth - EDGE_MARGIN;
      const maxTop = window.innerHeight - fab.offsetHeight - EDGE_MARGIN;
      const newLeft = clamp(startLeft + dx, EDGE_MARGIN, maxLeft);
      const newTop = clamp(startTop + dy, EDGE_MARGIN, maxTop);

      fab.style.left = `${newLeft}px`;
      fab.style.top = `${newTop}px`;
      e.preventDefault();
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      try { fab.releasePointerCapture(e.pointerId); } catch {}
      isDragging = false;
      fab.classList.remove('dragging');

      // Snap to left/right and top/middle/bottom
      const rect = fab.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const side = centerX < window.innerWidth / 2 ? 'left' : 'right';

      const topSnap = EDGE_MARGIN;
      const midSnap = Math.round((window.innerHeight - rect.height) / 2);
      const botSnap = window.innerHeight - rect.height - EDGE_MARGIN;
      const candidates = [topSnap, midSnap, botSnap];
      const distances = candidates.map(t => Math.abs(t - rect.top));
      const idx = distances.indexOf(Math.min(...distances));
      const snappedTop = candidates[idx];

      fab.style.transition = '';
      fab.style.transform = 'none';
      fab.style.top = `${snappedTop}px`;
      if (side === 'left') {
        fab.style.left = `${EDGE_MARGIN}px`;
        fab.style.right = 'auto';
      } else {
        fab.style.left = 'auto';
        fab.style.right = `${EDGE_MARGIN}px`;
      }

      e.preventDefault();
    }

    fab.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: false });
    window.addEventListener('pointercancel', onPointerUp, { passive: false });
  }

  function init() {
    ensureMounted();
    applyStylesheet();
    updateFabVisibility();
    setupThemeSync();
    // Load session for gating in future
    chrome.storage.sync.get(['la_session'], ({ la_session }) => {
      // Require validated Supabase session (set by popup after check-status)
      if (la_session && la_session.token && la_session.validated && la_session.source === 'supabase') {
        session = la_session;
      } else {
        session = null;
      }
      updateAuthGates();
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'LA_SESSION_UPDATED') {
      session = msg.payload;
      updateAuthGates();
    }
  });

  function updateAuthGates() {
    if (!panel) return;
    const sendBtn = panel.querySelector('#la-send');
    const input = panel.querySelector('#la-input');
    const counter = panel.querySelector('#la-counter');
    const tierLabel = panel.querySelector('#la-tier-label');
    const locked = panel.querySelector('#la-locked');
    const signedIn = !!(session && session.token && session.validated && session.source === 'supabase');
    if (sendBtn) sendBtn.disabled = !signedIn;
    if (input) {
      input.disabled = !signedIn;
      input.placeholder = signedIn ? 'Ask me anything about the course...' : 'Sign in via the extension popup to chat';
    }
    if (counter) counter.textContent = signedIn ? '7/10 messages' : 'Sign in to start';
    if (tierLabel) {
      const tier = session?.user?.tier || 'Free';
      tierLabel.textContent = typeof tier === 'string' ? tier : 'Free';
    }
    if (locked) {
      if (signedIn) {
        locked.setAttribute('aria-hidden', 'true');
        locked.classList.remove('open');
      } else {
        locked.setAttribute('aria-hidden', 'false');
        locked.classList.add('open');
      }
    }
  }

  init();
})();

