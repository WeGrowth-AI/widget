// Auth using Supabase; session persisted in chrome.storage.sync
import { signInWithPassword, saveSession, loadSession, clearSession, getCurrentUser, getOrganizationIdFromUser, sendEmailOtp, verifyEmailOtp, fetchStudentOrganizations, signInWithGoogle } from '../lib/supabase.js';
import { sendRuntimeMessage } from '../lib/runtime.js';

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
const otpBtn = document.getElementById('otpBtn');
const otpRow = document.getElementById('otpRow');
const otpCodeInput = document.getElementById('otpCode');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const googleBtn = document.getElementById('googleBtn');

async function setStatus(text) {
  statusEl.textContent = text;
}

async function doPasswordSignIn(email, password) {
  const { session, user } = await signInWithPassword(email, password);
  if (!session || !user) throw new Error('Invalid credentials');
  const organizationId = await getOrganizationIdFromUser(user);
  const laSession = {
    user: { id: user.id, email: user.email, organizationId },
    token: session.access_token,
    signedInAt: Date.now(),
  };
  await saveSession(laSession);
  return laSession;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value || '';
  const password = passwordInput.value || '';
  await setStatus('Signing in...');
  try {
    let session = await doPasswordSignIn(email, password);
    // Enrich via backend check-status
    try {
      const res = await sendRuntimeMessage({ type: 'LA_CHECK_STATUS', token: session.token });
      if (res?.ok && res.data) {
        const info = res.data || {};
        session = {
          ...session,
          user: {
            ...session.user,
            organizationId: info.organizationId || session.user.organizationId || null,
            role: info.role || 'STUDENT',
            tier: info.tier || 'BASIC',
            organizationName: info.organizationName || null
          }
        };
        await saveSession(session);
      }
    } catch {}
    await setStatus(`Signed in as ${session.user.email}`);
    chrome.runtime.sendMessage({ type: 'LA_SESSION_UPDATED', payload: session });
    showHome(session);
  } catch (err) {
    await setStatus(err?.message || 'Login failed.');
  }
});

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
  });
}

if (otpBtn) {
  otpBtn.addEventListener('click', async () => {
    const email = emailInput.value || '';
    if (!email) { await setStatus('Enter your email first.'); return; }
    await setStatus('Sending code...');
    try {
      await sendEmailOtp(email);
      await setStatus('Code sent. Check your email.');
      if (otpRow) { otpRow.classList.remove('hidden'); otpRow.setAttribute('aria-hidden', 'false'); }
    } catch (e) {
      await setStatus(e?.message || 'Failed to send code');
    }
  });
}

if (verifyOtpBtn) {
  verifyOtpBtn.addEventListener('click', async () => {
    const email = emailInput.value || '';
    const token = (otpCodeInput?.value || '').trim();
    if (!email || !token) { await setStatus('Enter email and code.'); return; }
    await setStatus('Verifying code...');
    try {
      const { session, user } = await verifyEmailOtp(email, token);
      const organizationId = await getOrganizationIdFromUser(user);
      let laSession = { user: { id: user.id, email: user.email, organizationId }, token: session.access_token, signedInAt: Date.now() };
      // Enrich via backend check-status
      try {
        const res = await sendRuntimeMessage({ type: 'LA_CHECK_STATUS', token: laSession.token });
        if (res?.ok && res.data) {
          const info = res.data || {};
          laSession = {
            ...laSession,
            user: {
              ...laSession.user,
              organizationId: info.organizationId || laSession.user.organizationId || null,
              role: info.role || 'STUDENT',
              tier: info.tier || 'BASIC',
              organizationName: info.organizationName || null
            }
          };
        }
      } catch {}
      await saveSession(laSession);
      await setStatus(`Signed in as ${user.email}`);
      chrome.runtime.sendMessage({ type: 'LA_SESSION_UPDATED', payload: laSession });
      showHome(laSession);
    } catch (e) {
      await setStatus(e?.message || 'Invalid code');
    }
  });
}

if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    await setStatus('Signing in with Google...');
    try {
      const { session, user } = await signInWithGoogle();
      const organizationId = await getOrganizationIdFromUser(user);
      let laSession = { user: { id: user.id, email: user.email, organizationId }, token: session.access_token, signedInAt: Date.now() };
      try {
        const res = await sendRuntimeMessage({ type: 'LA_CHECK_STATUS', token: laSession.token });
        if (res?.ok && res.data) {
          const info = res.data || {};
          laSession = {
            ...laSession,
            user: {
              ...laSession.user,
              organizationId: info.organizationId || laSession.user.organizationId || null,
              role: info.role || 'STUDENT',
              tier: info.tier || 'BASIC',
              organizationName: info.organizationName || null
            }
          };
        }
      } catch {}
      await saveSession(laSession);
      await setStatus(`Signed in as ${user.email}`);
      chrome.runtime.sendMessage({ type: 'LA_SESSION_UPDATED', payload: laSession });
      showHome(laSession);
    } catch (e) {
      await setStatus(e?.message || 'Google sign-in failed');
    }
  });
}

// Prefill previous state
loadSession().then(async (la_session) => {
  try {
    if (!la_session?.token) throw new Error('No session');
    const res = await sendRuntimeMessage({ type: 'LA_CHECK_STATUS', token: la_session.token });
    if (res?.ok && res.data) {
      const info = res.data || {};
      const updated = {
        ...la_session,
        validated: true,
        source: 'supabase',
        user: {
          ...la_session.user,
          organizationId: info.organizationId || la_session.user?.organizationId || null,
          role: info.role || la_session.user?.role || 'STUDENT',
          tier: info.tier || la_session.user?.tier || 'BASIC',
          organizationName: info.organizationName || la_session.user?.organizationName || null
        }
      };
      await saveSession(updated);
      statusEl.textContent = `Signed in as ${updated.user.email}`;
      showHome(updated);
      return;
    }
    throw new Error('Invalid session');
  } catch {
    await clearSession();
  }
});

function showHome(session) {
  if (!homeView) return;
  try { if (form && form.contains(document.activeElement)) document.activeElement.blur(); } catch {}
  form.classList.add('hidden');
  form.setAttribute('aria-hidden', 'true');
  form.setAttribute('inert', '');
  homeView.classList.remove('hidden');
  homeView.setAttribute('aria-hidden', 'false');
  homeView.removeAttribute('inert');
  titleEl.textContent = 'Communities';
  subtitleEl.textContent = 'Select a community to open its widget';
  renderCommunities(session);
  if (signOutIcon) signOutIcon.classList.remove('hidden');
}

function renderCommunities(session) {
  if (!communityList) return;
  // Preserve UI: fetch real orgs, fall back to mock silently
  (async () => {
    let communities = [];
    try {
      const orgRows = await fetchStudentOrganizations({ userId: session.user.id, access_token: session.token });
      communities = (orgRows || []).map((r) => {
        const org = r?.organization || {};
        const name = org.name || 'Organization';
        const initials = (name.split(/\s+/).map(w => w[0]).join('').slice(0, 2) || 'OR').toUpperCase();
        return { name, initials };
      });
    } catch {}
    if (!Array.isArray(communities) || communities.length === 0) {
      communities = getMockCommunities(session);
    }
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
  })();
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
    await clearSession();
    try { if (homeView && homeView.contains(document.activeElement)) document.activeElement.blur(); } catch {}
    form.classList.remove('hidden');
    form.setAttribute('aria-hidden', 'false');
    form.removeAttribute('inert');
    homeView.classList.add('hidden');
    homeView.setAttribute('aria-hidden', 'true');
    homeView.setAttribute('inert', '');
    titleEl.textContent = 'Welcome Back';
    subtitleEl.textContent = 'Sign in to continue to your dashboard';
    statusEl.textContent = '';
    if (signOutIcon) signOutIcon.classList.add('hidden');
  });
}

if (signOutIcon) {
  signOutIcon.addEventListener('click', async () => {
    await clearSession();
    try { if (homeView && homeView.contains(document.activeElement)) document.activeElement.blur(); } catch {}
    form.classList.remove('hidden');
    form.setAttribute('aria-hidden', 'false');
    form.removeAttribute('inert');
    homeView.classList.add('hidden');
    homeView.setAttribute('aria-hidden', 'true');
    homeView.setAttribute('inert', '');
    titleEl.textContent = 'Welcome Back';
    subtitleEl.textContent = 'Sign in to continue to your dashboard';
    statusEl.textContent = '';
    signOutIcon.classList.add('hidden');
  });
}

