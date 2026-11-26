# GG – Privacy Policy

_Last updated: 26 November 2026_

GG ("Greater experience for Gmail™") is a browser extension that adds keyboard
shortcuts and interface options to the Gmail web app. This policy explains what
data GG handles and what it does with it.

## Summary

**GG does not collect, store, sell or send your data anywhere.** It has no
servers, no analytics, no tracking and no advertising. Everything it does
happens inside your browser, on mail.google.com.

## Data GG handles locally

To do its job, GG reads some information from the Gmail page while you use it.
This information never leaves your browser and is not stored by GG.

- **Keyboard and mouse input in Gmail.** GG listens for the keys you press and
  which email your mouse pointer is over, so it can run the matching shortcut
  and show shortcut hints. Nothing is logged or recorded.
- **Email content, only when you ask for it.** When you use **Instant copy**,
  GG reads the open email's sender, recipients, date, subject and body and puts
  them on your clipboard. When you use **Quick quote**, it inserts the text you
  selected into your reply. This happens only when you press those shortcuts.
- **Your account's email address, only when you ask for it.** When you use
  **Copy link to email**, GG reads your signed-in address from the Gmail page to
  build a link that opens in the right Google account. The link goes to your
  clipboard.
- **Your account's email address, for one-time setup.** GG's shortcuts need
  Gmail's own keyboard shortcuts turned on. The first time GG sees a Gmail
  account, it reads that account's address from the page, opens Gmail's
  Settings → General, turns on "Keyboard shortcuts on" if it is off, and saves.
  This changes that one Gmail setting and nothing else.

## Data GG stores

GG stores **only your settings** (which shortcuts and appearance options are
turned on, and the settings page theme) using your browser's extension storage
(`chrome.storage.sync`). If you are signed in to your browser with sync turned
on, your browser may sync these settings across your devices; that sync is
provided by your browser vendor, not by GG.

GG also keeps a list of the Gmail **account addresses it has already set up**
(see one-time setup above), so it does that only once per account. This list is
kept in your browser's local extension storage (`chrome.storage.local`), never
synced or sent anywhere, and is deleted when you uninstall GG. No email content
is stored.

## Sharing

GG does not share, transfer or sell any data to anyone. It makes no network
requests.

## Limited Use

GG's use of information received from Gmail pages complies with the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq),
including the Limited Use requirements. Data is used only to provide GG's
user-facing features and for no other purpose.

## Permissions

- **storage**: save your settings and the list of accounts already set up.
- **Access to mail.google.com**: run GG's shortcuts and interface options inside
  Gmail. GG does not run on any other website.

## Changes

If this policy changes, the updated version will be published at this address
with a new "Last updated" date.

## Contact

Questions about this policy: [me+gg@snehil.dev](mailto:me+gg@snehil.dev)

---

GG is an independent project and is not affiliated with, endorsed by or
sponsored by Google. Gmail is a trademark of Google LLC.
