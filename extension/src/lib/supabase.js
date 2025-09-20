// Lightweight Supabase client for MV3 environment
// Uses @supabase/supabase-js CDN build via dynamic import when available,
// and falls back to REST calls for minimal operations.

// Env/config: stored in chrome.storage.sync to avoid bundling secrets in code
const CONFIG_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];

// Safe built-in defaults (used only if storage values are absent)
const SUPABASE_CONFIG_DEFAULTS = {
    SUPABASE_URL: 'https://wahihawlawxkjojllwfv.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhaGloYXdsYXd4a2pvamxsd2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNTU4MjksImV4cCI6MjA3MTczMTgyOX0.9DynpYyMXBy_Q1n7dA5BKqx5oqCL1WgOLg0tmfnHqsI'
};

async function getConfig() {
	return new Promise((resolve) => {
		chrome.storage.sync.get(CONFIG_KEYS, (items) => {
			resolve({
                SUPABASE_URL: items.SUPABASE_URL || SUPABASE_CONFIG_DEFAULTS.SUPABASE_URL,
                SUPABASE_ANON_KEY: items.SUPABASE_ANON_KEY || SUPABASE_CONFIG_DEFAULTS.SUPABASE_ANON_KEY
			});
		});
	});
}

// MV3 CSP blocks remote dynamic imports in extension pages; avoid CDN import
async function dynamicCreateClient() { return null; }

// Minimal REST helpers as fallback (auth endpoints only)
async function restSignInWithPassword(email, password) {
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = await getConfig();
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Missing Supabase config');
	const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		method: 'POST',
		headers: {
			'apikey': SUPABASE_ANON_KEY,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ email, password })
	});
	if (!resp.ok) {
		const err = await resp.json().catch(() => ({}));
		throw new Error(err.error_description || err.message || 'Sign-in failed');
	}
	return resp.json();
}

async function restGetUser(access_token) {
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = await getConfig();
	const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
		headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${access_token}` }
	});
	if (!resp.ok) throw new Error('Failed to fetch user');
	return resp.json();
}

export async function getSupabaseClient() {
	// Always return null to prefer REST helpers under MV3 CSP
	return null;
}

export async function signInWithPassword(email, password) {
	const client = await getSupabaseClient();
	if (client) {
		const { data, error } = await client.auth.signInWithPassword({ email, password });
		if (error) throw error;
		return data; // { session, user }
	}
	const data = await restSignInWithPassword(email, password);
	const user = await restGetUser(data.access_token);
	return { session: { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in }, user };
}

export async function signOut(access_token) {
	const client = await getSupabaseClient();
	if (client) {
		await client.auth.signOut();
		return;
	}
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = await getConfig();
	await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
		method: 'POST',
		headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${access_token}` }
	});
}

export async function getCurrentUser(access_token) {
	const client = await getSupabaseClient();
	if (client) {
		const { data, error } = await client.auth.getUser();
		if (error) return null;
		return data.user || null;
	}
	if (!access_token) return null;
	try { return await restGetUser(access_token); } catch { return null; }
}

export async function getOrganizationIdFromUser(user) {
	// Expect organization_id in user.user_metadata
	try { return user?.user_metadata?.organization_id || null; } catch { return null; }
}

// Email OTP (magic code) flows
export async function sendEmailOtp(email) {
	const client = await getSupabaseClient();
	if (client) {
		const { error } = await client.auth.signInWithOtp({ email, options: {} });
		if (error) throw error;
		return true;
	}
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = await getConfig();
	const resp = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
		method: 'POST',
		headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, create_user: false }
		)
	});
	if (!resp.ok) {
		const msg = await resp.text().catch(() => '');
		throw new Error(`Failed to send code: ${msg}`);
	}
	return true;
}

export async function verifyEmailOtp(email, token) {
	const client = await getSupabaseClient();
	if (client) {
		const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
		if (error) throw error;
		return data; // { session, user }
	}
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = await getConfig();
	const resp = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
		method: 'POST',
		headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
		body: JSON.stringify({ type: 'email', email, token })
	});
	if (!resp.ok) {
		const msg = await resp.text().catch(() => '');
		throw new Error(`Invalid code: ${msg}`);
	}
	const data = await resp.json();
	const user = await restGetUser(data.access_token);
	return { session: { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in }, user };
}

// Google OAuth (implicit flow) via chrome.identity
function parseHashParams(url) {
    try {
        const u = new URL(url);
        const hash = (u.hash || '').replace(/^#/, '');
        let obj = {};
        if (hash) {
            const qs = new URLSearchParams(hash);
            for (const [k, v] of qs.entries()) obj[k] = v;
        }
        if (!obj.access_token) {
            const qs2 = u.searchParams;
            for (const [k, v] of qs2.entries()) obj[k] = v;
        }
        return obj;
    } catch { return {}; }
}

export async function signInWithGoogle() {
    const { SUPABASE_URL } = await getConfig();
    if (!SUPABASE_URL) throw new Error('Missing Supabase config');
    const redirectUrl = chrome.identity.getRedirectURL();
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&response_type=token`;
    const resultUrl = await new Promise((resolve, reject) => {
        try {
            chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectedTo) => {
                const err = chrome.runtime.lastError;
                if (err) { reject(new Error(err.message || 'Authorization failed')); return; }
                if (!redirectedTo) { reject(new Error('No redirect URL')); return; }
                resolve(redirectedTo);
            });
        } catch (e) { reject(e); }
    });
    const params = parseHashParams(resultUrl);
    const access_token = params.access_token;
    const expires_in = params.expires_in ? Number(params.expires_in) : undefined;
    if (!access_token) throw new Error('Authorization denied');
    const user = await restGetUser(access_token);
    return { session: { access_token, expires_in }, user };
}

// Storage helpers for session persistence (chrome.storage.sync)
export async function saveSession(session) {
	return chrome.storage.sync.set({ la_session: session });
}

export async function loadSession() {
	return new Promise((resolve) => {
		chrome.storage.sync.get(['la_session'], ({ la_session }) => resolve(la_session || null));
	});
}

export async function clearSession() {
	return chrome.storage.sync.remove('la_session');
}

// Data access helpers (respect RLS via authenticated key)
async function authedFetch(path, access_token, params = '') {
	const { SUPABASE_URL, SUPABASE_ANON_KEY } = await getConfig();
	const url = `${SUPABASE_URL}/rest/v1/${path}${params}`;
	const resp = await fetch(url, {
		headers: {
			'apikey': SUPABASE_ANON_KEY,
			'Authorization': `Bearer ${access_token}`,
			'Accept-Profile': 'public',
			'Accept': 'application/json'
		}
	});
	if (!resp.ok) {
		const msg = await resp.text().catch(() => '');
		throw new Error(`Request failed: ${resp.status} ${msg}`);
	}
	return resp.json();
}

export async function fetchOrganizationContent({ organizationId, access_token }) {
	// GET /rest/v1/content?organizationId=eq.<id>&select=*&order=createdAt.desc
	const params = `?organizationId=eq.${encodeURIComponent(organizationId)}&select=*&order=createdAt.desc`;
	return authedFetch('content', access_token, params);
}

export async function fetchStudentThreads({ userId, organizationId, access_token }) {
	const q = new URLSearchParams();
	q.set('userId', `eq.${userId}`);
	q.set('organizationId', `eq.${organizationId}`);
	q.set('select', '*');
	q.set('order', 'createdAt.desc');
	return authedFetch('threads', access_token, `?${q.toString()}`);
}

export async function validateStudentAccess({ userId, organizationId, access_token }) {
	const q = new URLSearchParams();
	q.set('userId', `eq.${userId}`);
	q.set('organizationId', `eq.${organizationId}`);
	q.set('select', 'role');
	const rows = await authedFetch('Membership', access_token, `?${q.toString()}`);
	return Array.isArray(rows) && rows.some(r => r.role === 'STUDENT');
}

export async function ensureSecureAccess({ organizationId, dataType, access_token }) {
	const user = await getCurrentUser(access_token);
	if (!user) throw new Error('Not authenticated');
	const ok = await validateStudentAccess({ userId: user.id, organizationId, access_token });
	if (!ok) throw new Error('Access denied');
	if (dataType === 'content') return fetchOrganizationContent({ organizationId, access_token });
	if (dataType === 'threads') return fetchStudentThreads({ userId: user.id, organizationId, access_token });
	throw new Error('Unknown dataType');
}

// Organizations for a user (via Membership → Organization join)
export async function fetchStudentOrganizations({ userId, access_token }) {
    const q = new URLSearchParams();
    q.set('userId', `eq.${userId}`);
    q.set('role', 'eq.STUDENT');
    q.set('select', 'organization:Organization(*)');
    const rows = await authedFetch('Membership', access_token, `?${q.toString()}`);
    return Array.isArray(rows) ? rows : [];
}

// Expose config utilities for setup
export async function setSupabaseConfig({ url, anonKey }) {
	await chrome.storage.sync.set({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey });
	return true;
}

// Test connection
export async function testSupabaseConnection() {
	try {
		const { SUPABASE_URL, SUPABASE_ANON_KEY } = await getConfig();
		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			console.error('❌ Supabase config missing');
			return false;
		}

		// Test with a simple REST API call to check connection
		const resp = await fetch(`${SUPABASE_URL}/rest/v1/User?select=count&limit=1`, {
			headers: {
				'apikey': SUPABASE_ANON_KEY,
				'Accept': 'application/json'
			}
		});

		if (!resp.ok) {
			console.error('❌ Supabase connection failed:', resp.status, resp.statusText);
			return false;
		}

		console.log('✅ Supabase connection successful!');
		return true;
	} catch (err) {
		console.error('❌ Supabase connection failed:', err);
		return false;
	}
}


