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

## Customization

All colors and radii are defined in `src/styles/variables.css` using CSS variables.

## Notes

- This build intentionally excludes icons. Add PNGs to `assets/` and reference in `manifest.json` if desired.
- The chat is mocked; replace with API calls and real limits.

