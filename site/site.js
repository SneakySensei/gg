/* ===== Set these to the store listing URLs once they are published. =====
   Until then the buttons open a store search for GG. */
const CHROME_STORE_URL = '';
const FIREFOX_STORE_URL = '';

(() => {
  if (CHROME_STORE_URL) document.querySelectorAll('.js-store').forEach((a) => { a.href = CHROME_STORE_URL; });
  if (FIREFOX_STORE_URL) document.querySelectorAll('.js-store-ff').forEach((a) => { a.href = FIREFOX_STORE_URL; });
})();
