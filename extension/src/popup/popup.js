// Mock authentication storing state in chrome.storage.sync
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const statusEl = document.getElementById('status');
const togglePasswordBtn = document.getElementById('togglePassword');
const form = document.getElementById('signinForm');
const homeView = document.getElementById('homeView');
const titleEl = document.getElementById('viewTitle');
const subtitleEl = document.getElementById('viewSubtitle');
const signOutBtn = document.getElementById('signOutBtn');
const signOutIcon = document.getElementById('signOutIcon');
const communityList = document.getElementById('communityList');

async function setStatus(text) {
  statusEl.textContent = text;
}

async function mockAuthenticate(email, _password) {
  // In future, replace with Supabase; for now, accept any password
  await new Promise(r => setTimeout(r, 400));
  return {
    ok: true,
    user: {
      id: email.includes('coach') ? 'u-coach' : 'u-student',
      email,
      tier: 'Free',
      remainingMessages: 10,
    }
  };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value || 'creator@decster.com';
  const password = passwordInput.value;
  await setStatus('Signing in...');
  const result = await mockAuthenticate(email, password);
  if (result.ok) {
    const session = { user: result.user, token: 'mock-token', signedInAt: Date.now() };
    await chrome.storage.sync.set({ la_session: session });
    await setStatus(`Signed in as ${result.user.email}`);
    chrome.runtime.sendMessage({ type: 'LA_SESSION_UPDATED', payload: session });
    showHome(session);
  } else {
    await setStatus('Login failed.');
  }
});

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
  });
}

// Prefill previous state
chrome.storage.sync.get(['la_session'], ({ la_session }) => {
  if (la_session?.user?.email) {
    statusEl.textContent = `Signed in as ${la_session.user.email}`;
    showHome(la_session);
  }
});

function showHome(session) {
  if (!homeView) return;
  form.classList.add('hidden');
  form.setAttribute('aria-hidden', 'true');
  homeView.classList.remove('hidden');
  homeView.setAttribute('aria-hidden', 'false');
  titleEl.textContent = 'Communities';
  subtitleEl.textContent = 'Select a community to open its widget';
  renderCommunities(session);
  if (signOutIcon) signOutIcon.classList.remove('hidden');
}

function renderCommunities(session) {
  if (!communityList) return;
  const communities = getMockCommunities(session);
  communityList.innerHTML = '';
  for (const c of communities) {
    const item = document.createElement('button');
    item.className = 'community-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `<span class="community-logo">${c.initials}</span><span class="community-name">${c.name}</span>`;
    item.addEventListener('click', async () => {
      // Focus a skool tab or open one
      try {
        const [tab] = await chrome.tabs.query({ url: ['https://*.skool.com/*', 'https://skool.com/*'] });
        if (tab?.id) {
          await chrome.tabs.update(tab.id, { active: true });
        } else {
          await chrome.tabs.create({ url: 'https://www.skool.com' });
        }
        window.close();
      } catch {}
    });
    communityList.appendChild(item);
  }
}

function getMockCommunities(_session) {
  return [
    { name: 'Learn Spanish - Layers Method', initials: 'LS' },
    { name: 'Talas Akademija', initials: 'TA' },
    { name: 'Comunidad Japón', initials: 'CJ' },
    { name: 'Hamilton Dog Training', initials: 'HD' },
    { name: 'MasterPhoto Academy', initials: 'MP' },
  ];
}

if (signOutBtn) {
  signOutBtn.addEventListener('click', async () => {
    await chrome.storage.sync.remove('la_session');
    form.classList.remove('hidden');
    form.setAttribute('aria-hidden', 'false');
    homeView.classList.add('hidden');
    homeView.setAttribute('aria-hidden', 'true');
    titleEl.textContent = 'Welcome Back';
    subtitleEl.textContent = 'Sign in to continue to your dashboard';
    statusEl.textContent = '';
    if (signOutIcon) signOutIcon.classList.add('hidden');
  });
}

if (signOutIcon) {
  signOutIcon.addEventListener('click', async () => {
    await chrome.storage.sync.remove('la_session');
    form.classList.remove('hidden');
    form.setAttribute('aria-hidden', 'false');
    homeView.classList.add('hidden');
    homeView.setAttribute('aria-hidden', 'true');
    titleEl.textContent = 'Welcome Back';
    subtitleEl.textContent = 'Sign in to continue to your dashboard';
    statusEl.textContent = '';
    signOutIcon.classList.add('hidden');
  });
}

