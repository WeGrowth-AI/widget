## Project status — Learning Assistant Widget

Date: 2025-09-19
Version: 0.1.1

### Overview
- Manifest V3 Chrome extension that injects a learning assistant widget on `skool.com` domains.
- Login is a mock flow in the browser action popup; future swap to Supabase.
- A floating mid‑right chat button toggles a 384px right sidebar (button auto‑hides while the panel is open).

### Current capabilities
- MV3 setup with `action` popup, `background` service worker, and `content_scripts` restricted to `https://*.skool.com/*` and `https://skool.com/*`.
- Mock authentication in `src/popup` storing a session in `chrome.storage.sync` and broadcasting updates.
- Content script injects:
  - Floating chat button (light rounded square with dark outline chat bubble icon). Hidden when the panel is open.
  - Right sidebar UI:
    - Header refined: left square app tile with border, title in regular weight, "Free Tier" badge in regular weight with outline person icon, subtle light‑gray divider, minimal close button with pure‑white X.
    - Module section: summary styled as a card. Inside, a single scrollable module list (no nested dropdown) with items showing title + small description; hover and selected states match reference.
    - Chat area: bot avatar is a transparent rounded square with a subtle white border and a white‑stroke robot icon; user/bot bubbles with timestamps.
    - Input area: softened top divider, dark input, gold rounded‑square send button with thinner paper‑plane icon.
    - Upgrade area: centered title "Unlock unlimited access" and a separate rounded gold "UPGRADE" button.
  - Styling implemented via an injected stylesheet and local CSS variables (no Tailwind required).
- On install, an onboarding tab opens to the popup’s HTML to prompt login.
- `dist/` contains the loadable build for Chrome Dev mode.

### Styling
- Color tokens defined inside the injected root to avoid site CSS conflicts.
- Palette matches the spec: nearly black background `#1a1a1a`, deep grays for cards/bubbles, gold accents `#e9c677` (hover `#d4b366`), slate‑blue accent `#5b6b8a`, light gray text, muted borders `#d9d9d9`.
- Rounded radii (12–16px) and subtle shadows applied.

### Architecture
- `manifest.json`: MV3 config, host permissions for skool.com, web accessible resources for injected CSS.
- `src/popup/*`: mock login UI and logic.
- `src/content/*`: widget injection, panel UI, and basic mock chat response/counter.
- `src/background/service-worker.js`: install onboarding and session broadcast.

### How to run
1. Build/update `dist` (manual copy step): copy `extension/` → `dist/`.
2. Chrome → Extensions → Developer mode → Load unpacked → select `dist/`.
3. On first install, the onboarding tab opens. Choose a mock account and log in.
4. Visit a `skool.com` page and click the “AI” button.

### Project structure (key files)
```
extension/
  manifest.json
  src/
    background/service-worker.js
    content/content.js
    content/inject.css
    popup/popup.html
    popup/popup.css
    popup/popup.js
    styles/variables.css
dist/  (copy of extension/ for Chrome loading)
```

### Known gaps / next steps
- Fine tune spacing/colors to the design token spec (header icon, dropdown summary chevron alignment).
- Replace mock auth with Supabase (email/OAuth) and persist real tokens.
- Connect chat API; implement real message limits and tier logic.
- Move inline data‑URI icons to `assets/` for easier maintenance.
- Improve accessibility (keyboard navigation, focus traps, ARIA) and add ESC/shortcut to toggle the panel.
- Optional: use Shadow DOM for full style isolation if future site CSS collisions appear.

### Notes
- The extension intentionally avoids Tailwind; tokens are plain CSS variables.
- `web_accessible_resources` includes `src/content/inject.css` to allow stylesheet injection on skool.com pages.


