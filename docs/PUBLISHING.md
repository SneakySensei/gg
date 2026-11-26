# Publishing GG to the Chrome Web Store

This is the full path from this repo to a live Chrome Web Store listing. Steps
are marked **[You]** when they need you (accounts, payment, identity, legal
choices, screenshots of your Gmail) and **[Automated]** when a script does it.

> Policies change. Everything here was checked against Google's documentation in
> November 2026; skim the linked pages again before you submit.

---

## 0. Original code check  **[Done]**

An earlier version of the shortcut engine was ported from the CMDK extension,
whose files say no licence is granted to copy or reimplement them. That code has
been replaced: `utils/engine/` is a new implementation that finds Gmail's
controls by their visible labels and roles and uses only Gmail's own documented
keyboard shortcuts. Shortcut *ideas* (which key does what) are not protected.
Keep new features original in the same way.

---

## 1. Create a developer account  **[You]**

1. Turn on **2-Step Verification** on the Google account you'll publish with
   (required to publish or update items).
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   and register. There's a **one-time US$5 fee**.
3. Set your **publisher name** (shown on the listing, e.g. your name or "GG")
   and a **contact email**, and verify the email.

Consider a separate Google account for publishing, so your personal Gmail
isn't tied to the listing.

## 2. Declare trader / non-trader status  **[You, legal choice]**

The EU Digital Services Act requires every publisher to declare whether they
are a **trader** (acting for business purposes) or **non-trader**.

- A free, personal, non-commercial project is usually **non-trader**. Google
  says the classification is your own legal call.
- If you declare **trader**, your legal name, address and a phone number
  (verified by SMS) are shown publicly on the listing, and you'll need a Google
  Payments profile.

## 3. Host the privacy policy  **[You, ~5 minutes]**

Google requires a privacy policy for any extension that **handles** user data,
even if the data never leaves the browser. GG reads email text (instant copy,
quick quote), your address (copy link) and your keystrokes, so it needs one.

- The policy is [`site/privacy.html`](../site/privacy.html), the only copy.
  Edit it there and update its "Last updated" date. The contact line is
  me@snehil.dev.
- The website publishes it (see [Website](#website) below) at
  **`https://gg.snehil.dev/privacy.html`**.
- Paste `https://gg.snehil.dev/privacy.html` into the dashboard's Privacy tab.

## Website  **[You once, then Automated]**

The landing page and privacy policy live in `site/` (plain HTML, no build step) and
deploy to GitHub Pages at `https://gg.snehil.dev` through `.github/workflows/pages.yml`
on every push to `main` that touches `site/`.

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. At the DNS host for `snehil.dev`, add `CNAME gg → <github-username>.github.io`.
3. In Settings → Pages, set the custom domain to `gg.snehil.dev` (`site/CNAME`
   already holds it) and, once the certificate is issued, tick **Enforce HTTPS**.
4. **Design tokens stay in sync.** `site/tokens.css` (and the components in
   `site/components.css`) are copied verbatim from `entrypoints/options/style.css`,
   so the site looks exactly like the settings page. When you change a token or
   component there, copy the change into `site/` too.
5. When the store listing is live, set `CHROME_STORE_URL` at the top of
   `site/site.js` so the "Add to Chrome" buttons point at it.

## 4. Take screenshots  **[You]**

At least **one** 1280×800 screenshot is required (up to five).

- Use a **separate test Gmail account** with a few sample emails, so no real
  names, subjects or addresses appear in public screenshots.
- In Chrome DevTools (F12 → device toolbar), set the window to **1280×800**,
  then capture with the DevTools menu → *Capture screenshot*.
- Good shots: a shortcut nudge on a Gmail button; the Minimal preset; the
  settings page (Keyboard Shortcuts tab); the Appearance tab.

## 5. Generate the promo images and icon  **[Automated]**

```powershell
bun run store:assets
```

Writes to `store/assets/`: `icon-128.png` (store icon),
`promo-small-440x280.png` (required small tile) and
`promo-marquee-1400x560.png` (optional marquee).

## 6. Build the release package  **[Automated]**

```powershell
bun run release:check
```

Type-checks, then builds `.output/gg-1.0.0-chrome.zip` (upload this), plus
`gg-1.0.0-firefox.zip` and a sources zip for Firefox Add-ons later.

Before each new release, bump `version` in `package.json`. The store rejects an
upload whose version isn't higher than the live one.

## 7. First upload and listing  **[You, in the dashboard]**

The first upload **must be done by hand**: the API can't create new items.

1. Dashboard → **Add new item** → upload `.output/gg-1.0.0-chrome.zip`.
2. **Store listing** tab: paste from [`store/listing.md`](../store/listing.md)
   (description, category, language) and upload the images from step 4 and 5.
3. **Privacy** tab: paste the single purpose and the two permission
   justifications, answer "No" to remote code, tick the data categories and the
   three certifications exactly as listed in `store/listing.md`, and add the
   privacy policy URL.
4. **Distribution** tab: free, all regions (or choose), visibility **Public**.
   You can pick **Unlisted** first to test with a link before going public.
5. **Submit for review.** You can choose to publish automatically once
   approved, or publish manually.

## 8. Review  **[Wait]**

- Google gives no fixed review time. Small extensions often clear in days; host
  permissions can add time, but GG asks only for `storage` and
  `mail.google.com`, the narrowest a Gmail extension can be, which helps.
- If rejected, the email names the policy. Fix it and resubmit; rejections
  aren't permanent.

## 9. Automate future updates  **[You once, then Automated]**

After the item exists, updates can be pushed from the command line with the
Chrome Web Store API (v2, service-account auth) via `wxt submit`.

One-time setup **[You]**:

1. In [Google Cloud Console](https://console.cloud.google.com/), create a
   project and enable the **Chrome Web Store API**.
2. Create a **service account** and download a **JSON key**.
3. Give that service account access to your publisher, following Google's
   [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)
   guide.
4. Copy `.env.submit.example` to `.env.submit` (gitignored) and fill in the
   extension ID, publisher ID, service account email and private key.

Then, for every release **[Automated]**:

```powershell
bun run release:check
```

```powershell
bun run submit:chrome:dry
```

```powershell
bun run submit:chrome
```

`submit:chrome:dry` only checks authentication. `submit:chrome` uploads the new zip
and submits it for review.

## 10. After launch

- Keep the name in the form "GG – … for Gmail™" and the trademark line in the
  description (see README → Branding).
- When you add a feature that handles new kinds of data or needs a new
  permission, update the privacy policy and the Privacy tab **before** the
  release that ships it.
- Watch the dashboard for policy emails; Google sometimes asks for changes on
  already-published items.

---

### Sources

- [Chrome Web Store branding guidelines](https://developer.chrome.com/docs/webstore/branding)
- [Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Supplying images](https://developer.chrome.com/docs/webstore/images)
- [Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Single purpose / quality guidelines](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq)
- [Review process](https://developer.chrome.com/docs/webstore/review-process)
- [Trader / non-trader disclosure](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure)
- [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)
- [`wxt submit` reference](https://wxt.dev/api/cli/wxt-submit)
