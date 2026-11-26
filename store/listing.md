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
**Support URL:** mailto:me+gg@snehil.dev (or the gg repo's Issues page)

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

**Privacy policy URL:** the public URL where you host `store/privacy-policy.md` (see docs/PUBLISHING.md).
