// Mock authentication storing state in chrome.storage.sync
const accountSelect = document.getElementById('account');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const statusEl = document.getElementById('status');

async function setStatus(text) {
  statusEl.textContent = text;
}

async function mockAuthenticate(email, _password) {
  // In future, replace with Supabase; for now, accept any password
  await new Promise(r => setTimeout(r, 400));
  return {
    ok: true,
    user: {
      id: email === 'coach@example.com' ? 'u-coach' : 'u-student',
      email,
      tier: 'Free',
      remainingMessages: 10,
    }
  };
}

loginBtn.addEventListener('click', async () => {
  const email = accountSelect.value === 'coach' ? 'coach@example.com' : 'student@example.com';
  const password = passwordInput.value;
  await setStatus('Signing in...');
  const result = await mockAuthenticate(email, password);
  if (result.ok) {
    const session = { user: result.user, token: 'mock-token', signedInAt: Date.now() };
    await chrome.storage.sync.set({ la_session: session });
    await setStatus('Signed in. You can use the widget on skool.com');
    // Notify content scripts
    chrome.runtime.sendMessage({ type: 'LA_SESSION_UPDATED', payload: session });
  } else {
    await setStatus('Login failed.');
  }
});

// Prefill previous state
chrome.storage.sync.get(['la_session'], ({ la_session }) => {
  if (la_session?.user?.email) {
    statusEl.textContent = `Signed in as ${la_session.user.email}`;
  }
});

