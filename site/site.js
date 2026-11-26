/* ===== Set these to the store listing URLs once they are published. =====
   Until then the buttons open a store search for GG. */
const CHROME_STORE_URL = '';
const FIREFOX_STORE_URL = '';

(() => {
  if (CHROME_STORE_URL) document.querySelectorAll('.js-store').forEach((a) => { a.href = CHROME_STORE_URL; });
  if (FIREFOX_STORE_URL) document.querySelectorAll('.js-store-ff').forEach((a) => { a.href = FIREFOX_STORE_URL; });

  // Chrome is primary by default (Chromium browsers and everything else).
  // On a Firefox-based browser, Add to Firefox becomes primary and comes first.
  if (!/firefox|fxios/i.test(navigator.userAgent)) return;
  const ffHref = document.querySelector('.js-store-ff').href;
  document.querySelectorAll('.js-store-ff').forEach((ff) => {
    ff.classList.replace('btn--secondary', 'btn--primary');
    const ch = ff.parentElement.querySelector('.js-store');
    if (!ch) return;
    ch.classList.replace('btn--primary', 'btn--secondary');
    ff.parentElement.insertBefore(ff, ch);
  });
  // The nav keeps one button: point it at Firefox.
  const nav = document.querySelector('.nav__actions .js-store');
  if (nav) {
    nav.classList.replace('js-store', 'js-store-ff');
    nav.href = ffHref;
    nav.lastChild.textContent = 'Add to Firefox';
    nav.querySelector('img').src = 'assets/icons/firefox.svg';
  }
})();
