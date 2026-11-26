# Chrome Web Store listing: copy and form answers

Paste these into the Chrome Web Store Developer Dashboard. Each heading matches a
field or tab in the dashboard. Keep them in sync with what the extension does.

---

## Store listing tab

**Name** (comes from the manifest, max 75 characters)

> GG – Greater experience for Gmail™

**Summary** (manifest `description`, max 132 characters)

> Faster keyboard shortcuts and a cleaner look for Gmail™, built for reaching inbox zero. Gmail is a trademark of Google LLC.

**Category:** Productivity → Workflow & Planning (or Productivity → Communication)

**Language:** English

**Description**

```
GG makes Gmail™ faster to work through, so you can reach inbox zero sooner.

KEYBOARD SHORTCUTS
• Act on the email under your mouse pointer: archive (E), reply (R), reply all (A), forward (F), star (S), label (L), snooze (B or H), delete (#, Del or Backspace)
• Smart Escape closes emails and popups or takes you back to your inbox
• Jump to the top or bottom of the list (g g, Shift + G) and page with the arrow keys
• Toggle read/unread (U), star and archive at once (Shift + S), move to inbox (V)
• Compose helpers: schedule send, edit subject, attach file, quick quote, paste a URL over text to link it
• RSVP to invites from the keyboard (Shift + Y / M / N)
• Copy an email or a link to it instantly
• Every shortcut can be switched on or off individually

SHORTCUT NUDGES
Hover any Gmail button to see its keyboard shortcut, so you learn them as you go.

A CLEANER GMAIL
Choose Classic (Gmail as Google made it) or Minimal, then fine-tune: hide the Support, Gemini and Upgrade buttons, the main menu button and the right side panel.

PRIVATE BY DESIGN
GG runs entirely inside your browser on mail.google.com. It never sends your email or any other data anywhere, has no servers, no analytics and no ads. Your settings sync through your own browser account.

GG builds on Gmail's own keyboard shortcuts. The first time you open each Gmail account, GG turns them on for you in Gmail Settings → General.

GG is an independent project and is not affiliated with, endorsed by or sponsored by Google. Gmail is a trademark of Google LLC.
```

**Graphic assets** (generate with `bun run store:assets`, files in `store/assets/`)

| Field | File | Required |
| --- | --- | --- |
| Store icon 128×128 | `icon-128.png` | Yes |
| Screenshots 1280×800 (1–5) | take manually (see docs/PUBLISHING.md) | Yes, at least 1 |
| Small promo tile 440×280 | `promo-small-440x280.png` | Yes |
| Marquee promo tile 1400×560 | `promo-marquee-1400x560.png` | Optional |

**Official URL / homepage:** your repo or project page (optional)
**Support URL:** mailto:me@snehil.dev (or the gg repo's Issues page)

---

## Privacy practices tab

**Single purpose**

> GG improves the Gmail web app with configurable keyboard shortcuts and optional interface simplifications, so users can process their email faster.

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `storage` | Saves the user's settings (which shortcuts and appearance options are enabled, and the settings page theme) using chrome.storage.sync so they persist and follow the user's browser profile. It also keeps, in chrome.storage.local only, the list of Gmail account addresses for which GG has already turned on Gmail's keyboard shortcuts, so that one-time setup isn't repeated. No email content is stored. |
| Host permission `*://mail.google.com/*` | GG only works inside Gmail. It needs to run on mail.google.com to listen for keyboard shortcuts, trigger Gmail's own actions (archive, reply, label…), show shortcut hints on Gmail's buttons and hide optional parts of Gmail's interface. It runs on no other site. |

**Remote code:** No, I am not using remote code. (All JavaScript ships inside the package; nothing is fetched or evaluated at runtime.)

**Data usage: what user data is collected?**

GG does not collect or transmit any user data. It does, however, *handle* some data locally while it runs, which you must still disclose:

| Category | Tick? | Why |
| --- | --- | --- |
| Personally identifiable information | Tick | GG reads the signed-in account's email address from the Gmail page to build the "copy link to this email" URL, and to remember (in local extension storage only) which accounts it has already turned on Gmail's keyboard shortcuts for. It is never sent anywhere. |
| Website content | Tick | The "instant copy" and "quick quote" shortcuts read the open email's text (sender, recipients, date, body) and place it on your clipboard or into your reply, locally, when you press the shortcut. |
| User activity | Tick | GG listens for keystrokes and mouse position inside Gmail to run shortcuts and show hints. Nothing is recorded or sent. |
| Health, financial, authentication, personal communications (other), location, web history | Don't tick | Not handled. |

> If the dashboard's wording for a category doesn't match the above, choose the closest one. The rule of thumb in Google's policy: disclose anything the extension *handles*, even if it never leaves the browser.

**Certifications** (tick all three; they are true for GG)

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://gg.snehil.dev/privacy.html` (source: `site/privacy.html`).

---

## Notes to reviewer

Paste into **Firefox Add-ons â†’ Notes to Reviewer** on every submission. Chrome's
dashboard has no such field; use the same text if a Chrome reviewer asks questions.

```text
GG adds keyboard shortcuts, shortcut hints and optional interface clean-ups to the Gmail web app. It runs only on mail.google.com, makes no network requests, loads no remote code and collects no data.

BUILD (source code is attached)
- Requirements: Bun 1.4.x (https://bun.sh). No other tools or environment variables are needed.
- Commands: bun install, then bun run zip:firefox
- Output: .output/gg-<version>-firefox.zip. The uploaded add-on is built exactly this way, with WXT and TypeScript.

HOW IT WORKS
- gmail-shortcuts.js runs in the page's MAIN world. That is required because Gmail only reacts to keyboard events with legacy keyCode/which values, which an isolated content script cannot give to the page's own listeners. This script does not use any extension APIs.
- gmail-bridge.js (isolated world) reads the user's settings from storage.sync and passes them to the MAIN-world script with window.postMessage, restricted to the page's own origin.
- appearance.js toggles CSS classes on <html> to hide optional parts of Gmail's interface (only when the user turns those switches on).
- onboarding.js: GG needs Gmail's own "Keyboard shortcuts" setting turned on. The first time it sees a Gmail account, it opens Gmail's Settings > General, selects "Keyboard shortcuts on" if it is off, and clicks Save. It only ever turns that one setting on. It remembers the account address in storage.local so this happens once per account. That list never leaves the browser.
- The options page (settings) opens on install with a short welcome screen. "Get started" opens Gmail in a new tab to run the step above.

PERMISSIONS
- storage: the user's settings (storage.sync) and the list of accounts already set up (storage.local).
- Host permission *://mail.google.com/*: GG only works inside Gmail.

DATA
data_collection_permissions is "none": nothing is collected or transmitted. Features that read email text (copy an email, quote a selection) put it on the user's clipboard or in their reply, only when the user presses that shortcut.

TESTING
Any Gmail account works; the English Gmail interface is assumed. Open Gmail, then:
1. Hover a toolbar button (Archive, Delete): a hint shows its name and key.
2. Open an email and press E to archive it, or hover an email in the list and press E.
3. Press Esc to go back to the inbox.
4. Open GG's settings (toolbar icon) > Appearance > Minimal to hide optional parts of Gmail.

Privacy policy: https://gg.snehil.dev/privacy.html
Gmail is a trademark of Google LLC. GG is an independent project and is not affiliated with Google.
```

---

## Screenshot captions

Upload `store/assets/screenshot-1.png` â€¦ `screenshot-5.png` in this order. Firefox Add-ons
shows a caption under each one; the Chrome Web Store has no caption field.

| File | Caption |
| --- | --- |
| `screenshot-1.png` | GG puts Gmailâ„¢ on the keyboard: archive, reply, delete and star with a single key. |
| `screenshot-2.png` | Hover any button to see its name and shortcut, so you learn the keys as you go. |
| `screenshot-3.png` | The Minimal preset hides Gemini, Upgrade and the side panels for a calmer inbox. |
| `screenshot-4.png` | Turn every shortcut on or off individually. Changes apply instantly. |
| `screenshot-5.png` | One click to get started: GG turns on Gmail's keyboard shortcuts for each account. |
