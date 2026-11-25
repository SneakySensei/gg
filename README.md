# GG – Greater experience for Gmail™

<img src="branding/logo-512.png" alt="GG logo" width="96" />

GG is a browser extension (Chromium + Firefox, built with [WXT](https://wxt.dev)) that adds better keyboard shortcuts to Gmail, modelled on CMDK's shortcut set. Every shortcut can be turned on or off from the options page (click the toolbar icon).

> Requires Gmail's own **Keyboard shortcuts on** (Gmail Settings → General). Most shortcuts work by triggering Gmail's native ones.

## Develop

```sh
bun install
cp .env.example .env.local   # set CHROMIUM_BINARY / CHROMIUM_PROFILE
bun run dev                  # Chromium (Brave) with hot reload
bun run dev:firefox          # Firefox 128+
```

Close the browser before `bun run dev` when pointing at your real profile: Chromium locks the profile while it is open.

**Google Chrome with your real profile:** Chrome 136+ refuses to auto-load extensions into its default profile (remote debugging is blocked there, and the old `--disable-features=DisableLoadExtensionCommandLineSwitch` escape hatch is gone since Chrome 139). Instead, set `DEV_LAUNCH_BROWSER=false` in `.env.local`, run `bun run dev`, and once: `chrome://extensions` → Developer mode → **Load unpacked** → `.output/chrome-mv3-dev`. It stays installed and hot-reloads while the dev server runs (Alt+R reloads manually). Brave and separate profiles still auto-launch.

Build / package: `bun run build`, `bun run build:firefox`, `bun run zip`, `bun run zip:firefox`.

## Layout

- `utils/shortcuts.ts` – shortcut registry (ids, groups, keys, defaults) shared by all parts.
- `entrypoints/gmail-shortcuts.content.ts` – the key handler, which runs in the page's MAIN world so synthetic key events reach Gmail with real keyCodes in both browsers.
- `entrypoints/gmail-bridge.content.ts` – isolated-world bridge that forwards settings from `storage.sync` to the engine.
- `utils/gmail/` – Gmail DOM helpers, hover-row tracking, and actions (smart Esc, RSVP, compose helpers, copy).
- `entrypoints/options/` – settings UI.

## Branding

- `branding/logo.svg` is the source logo (a keyboard key printed with "GG"). After editing it, run `bun branding/render-icons.ts` to regenerate `public/icon/*.png` and `branding/logo-512.png`.
- Keep the store title in the form "GG – … for Gmail™" and include "Gmail is a trademark of Google LLC." in the description (Google's trademark guidelines allow "for Gmail™" only as a compatibility reference).
