(() => {
  const SCOPE_OK = /(^|\.)skool\.com$/i.test(location.hostname);
  if (!SCOPE_OK) return;

  let root, panel, fab, chatListEl, inputEl, counterEl;
  let session = null;
  let messageCount = 0;
  let initialGreetingShown = false;
  let selectedModule = 'Introduction to Digital Marketing';

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
    fab.addEventListener('click', togglePanel);
    root.appendChild(fab);

    // Panel
    panel = document.createElement('div');
    panel.className = 'la-panel';
    panel.innerHTML = `
      <div class=\"la-header\">
        <div class=\"la-logo\">AI</div>
        <div class=\"la-head-main\">
          <div class=\"la-title\">Learning Assistant</div>
          <div class=\"la-subrow\">
            <span class=\"la-badge with-icon\"><span class=\"ico user-ico\" aria-hidden=\"true\"></span> Free Tier</span>
            <span class=\"la-counter\" id=\"la-counter\">7/10 messages</span>
          </div>
        </div>
        <button class=\"la-close\" id=\"la-close\" aria-label=\"Close\">✕</button>
      </div>

      <div class="la-section">
        <details class="la-accordion" id="la-module-accordion">
          <summary>
            <span class=\"la-sum-left\"><span class=\"la-sum-icon\">📚</span> <span>Select Module</span></span>
            <span class=\"la-sum-caret\"></span>
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
    // Mock bot reply
    setTimeout(() => {
      appendMessage("Hi! I'm your AI learning assistant. Select a module to get started, or ask me any questions about your course content.", 'bot');
    }, 400);
  }

  function maybeShowInitialGreeting() {
    if (initialGreetingShown || !chatListEl) return;
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

  function init() {
    ensureMounted();
    applyStylesheet();
    updateFabVisibility();
    // Load session for gating in future
    chrome.storage.sync.get(['la_session'], ({ la_session }) => {
      session = la_session || null;
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'LA_SESSION_UPDATED') {
      session = msg.payload;
    }
  });

  init();
})();

