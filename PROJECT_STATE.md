## Project status — Learning Assistant Widget

Date: 2025-09-19
Version: 0.1.2

### Overview
- Manifest V3 Chrome extension that injects a learning assistant widget on `skool.com` domains.
- Login is a mock flow in the browser action popup; future swap to Supabase.
- A floating mid‑right chat button toggles a 384px right sidebar (button auto‑hides while the panel is open).

### Current capabilities
- MV3 setup with `action` popup, `background` service worker, and `content_scripts` restricted to `https://*.skool.com/*` and `https://skool.com/*`.
- Mock authentication in `src/popup` storing a session in `chrome.storage.sync` and broadcasting updates.
- Popup flow:
  - Login view: email + password fields (any password accepted for demo).
  - After sign-in, popup switches to Communities view.
  - Communities view: list of communities with rounded square logo (10px) and name; subtle 1px rounded border (10px) on each row; clicking opens/focuses a Skool tab.
  - Sign out is an icon button in the header’s top-right; clears session and returns to Login.
  - "Need help?" label colored `#426dd7`.
- Content script injects:
  - Floating chat button (light rounded square with dark outline chat bubble icon). Hidden when the panel is open.
  - Right sidebar UI:
    - Header refined: left square app tile with border, title in regular weight, "Free Tier" badge in regular weight with outline person icon, subtle light‑gray divider, minimal close button with pure‑white X.
    - Module section: summary styled as a card. Inside, a single scrollable module list (no nested dropdown) with items showing title + small description; hover and selected states match reference.
    - Chat area: bot avatar is a transparent rounded square with a subtle white border and a white‑stroke robot icon; user/bot bubbles with timestamps.
    - Input area: softened top divider, dark input, gold rounded‑square send button with thinner paper‑plane icon.
    - Upgrade area: centered title "Unlock unlimited access" and a separate rounded gold "UPGRADE" button.
  - Styling implemented via an injected stylesheet and local CSS variables (no Tailwind required).
  - Automatic theme sync with skool.com (light/dark) with runtime updates (MutationObserver + fallbacks).
- On install, an onboarding tab opens to the popup’s HTML to prompt login.
- `dist/` contains the loadable build for Chrome Dev mode.

### Styling
- Popup palette: header `#fef3e0`, body `#f7ebd7`. No outer rounding on Chrome’s popup host frame (not stylable); inner UI uses square container with rounded controls where needed.
- Communities list items have a 1px border (`var(--la-border)`) and `10px` radius; logos are rounded squares (`10px`).
- Injected widget tokens are defined inside the injected root to avoid site CSS conflicts.
- Injected widget palette: nearly black background `#1a1a1a`, deep grays for cards/bubbles, gold accents `#e9c677` (hover `#d4b366`), slate‑blue accent `#5b6b8a`, light gray text, muted borders `#d9d9d9`.
- Rounded radii (12–16px) and subtle shadows applied in the injected widget.

#### Theme modes
- Auto-detects skool.com theme and toggles `.theme-light` / `.theme-dark` on the widget root.
- Light mode (target palette for the right panel):
  - Header: `#fef3e0`
  - Body: `#f7ebd7`
  - AI avatar background: `#fef3e0`
  - Robot icon stroke: `#8a847a`
- Dark mode: unchanged; uses the existing dark tokens listed above.

### Architecture
- `manifest.json`: MV3 config, host permissions for skool.com, web accessible resources for injected CSS.
- `src/popup/*`: mock login UI and logic.
- `src/content/*`: widget injection, panel UI, and basic mock chat response/counter.
- `src/background/service-worker.js`: install onboarding and session broadcast.

### How to run
1. Build/update `dist` (manual copy step): copy `extension/` → `dist/`.
2. Chrome → Extensions → Developer mode → Load unpacked → select `dist/`.
3. On first install, the onboarding tab opens. Enter an email and any password to sign in.
4. After sign-in, opening the popup shows Communities; click a community to focus/open Skool.
5. Visit a `skool.com` page and click the “AI” button to use the sidebar widget.

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
- Light theme not fully applied in the right panel yet. Align all surfaces to the popup’s light palette order (header `#fef3e0`, body `#f7ebd7`), ensure AI avatar background `#fef3e0` and robot stroke `#8a847a`, verify across Skool pages.
- Fine tune spacing/colors to match final design (header icon alignment, list density).
- Replace mock auth with Supabase (email/OAuth) and persist real tokens.
- Replace mock communities with a real list from backend; remember last-selected community.
- Connect chat API; implement real message limits and tier logic.
- Move inline data‑URI icons to `assets/` for easier maintenance.
- Improve accessibility (keyboard navigation, focus traps, ARIA) and add ESC/shortcut to toggle the panel.
- Optional: use Shadow DOM for full style isolation if future site CSS collisions appear.

### Notes
- The extension intentionally avoids Tailwind; tokens are plain CSS variables.
- `web_accessible_resources` includes `src/content/inject.css` to allow stylesheet injection on skool.com pages.


