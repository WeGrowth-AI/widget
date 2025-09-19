# Learning Assistant Widget (Chrome MV3 Extension)

A Manifest V3 extension for skool.com that provides a login popup and injects a mid-right floating chat widget which opens a 384px right sidebar matching the provided UI.

## Install locally

1. Open Chrome → Extensions → Enable Developer mode.
2. Click "Load unpacked" and select the `dist/` folder (not `extension/`).
3. On first install, the popup opens automatically. Choose a mock account and login.
4. Visit any `skool.com` page. The floating "AI" button appears mid‑right. Click to open the sidebar.

## Tech

- Manifest V3, background service worker, action popup
- Content script limited to `https://*.skool.com/*`
- Mock auth stored in `chrome.storage.sync` (Supabase to be added later)
 - Supabase auth wired for password and email OTP (requires config)

## Customization

All colors and radii are defined in `src/styles/variables.css` using CSS variables.

## Notes

- This build intentionally excludes icons. Add PNGs to `assets/` and reference in `manifest.json` if desired.
- The chat is mocked; replace with API calls and real limits.

## Supabase setup

1. In Chrome, open the extension popup. Click the subtitle until you see status; this indicates the popup is active.
2. In DevTools console for the popup, run:

```js
// Save config in extension storage (MV3 safe)
await chrome.storage.sync.set({
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_PUBLIC_KEY'
});
```

3. Sign in using either:
- Password: enter email/password and click Sign In
- Email code: enter email → click "Email me a code" → enter code → Verify

Sessions are stored as `la_session` in `chrome.storage.sync` and broadcast to Skool tabs.

### Testing
- Copy `extension/` → `dist/` and load unpacked.
- After sign-in, the widget input is enabled on `skool.com` pages.
- Optional: Use Supabase SQL to set `user_metadata.organization_id` on your test user to see org scoping in future data calls.

## Backend API setup

Store your API base URL in extension storage so the background can call your Next.js routes:

```js
await chrome.storage.sync.set({ API_BASE_URL: 'https://your-web-portal-domain.com' });
```

Endpoints used:
- Auth status: `/api/auth/check-status` (expects Authorization Bearer token)
- Student chat: `/api/student/chat` (expects `{ organizationId, message, threadId? }` JSON + Bearer)

On successful sign-in, the popup enriches the session by calling `check-status` to retrieve `organizationId`, `role`, `tier`, and `organizationName`.

