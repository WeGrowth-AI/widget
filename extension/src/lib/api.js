// Minimal backend API client for MV3. Configuration stored in chrome.storage.sync.

const API_KEYS = ['API_BASE_URL'];

export async function getApiBaseUrl() {
	return new Promise((resolve) => {
		chrome.storage.sync.get(API_KEYS, (items) => resolve(items.API_BASE_URL || ''));
	});
}

async function apiFetch(path, { token, method = 'GET', body } = {}) {
	const baseUrl = await getApiBaseUrl();
	if (!baseUrl) throw new Error('Missing API_BASE_URL');
	const url = baseUrl.replace(/\/$/, '') + path;
	const headers = { 'Content-Type': 'application/json' };
	if (token) headers['Authorization'] = `Bearer ${token}`;
	const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
	if (!resp.ok) {
		const text = await resp.text().catch(() => '');
		const msg = text || `${resp.status}`;
		const err = new Error(msg);
		err.status = resp.status;
		throw err;
	}
	const ct = resp.headers.get('content-type') || '';
	if (ct.includes('application/json')) return resp.json();
	return resp.text();
}

export async function checkStatus(token) {
	return apiFetch('/api/auth/check-status', { token, method: 'GET' });
}

export async function postChat({ token, organizationId, message, threadId }) {
	return apiFetch('/api/student/chat', {
		token,
		method: 'POST',
		body: { organizationId, message, threadId }
	});
}


