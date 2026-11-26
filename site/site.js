/* ===== Set this to the Chrome Web Store listing URL once it is published. =====
   Until then the "Add to Chrome" buttons open a Chrome Web Store search for GG. */
const CHROME_STORE_URL = '';

(() => {
  if (CHROME_STORE_URL) document.querySelectorAll('.js-store').forEach((a) => { a.href = CHROME_STORE_URL; });

  // The preset cards pick like they do in GG's settings.
  const cards = [...document.querySelectorAll('.look .preset')];
  cards.forEach((card) => card.addEventListener('click', () => {
    cards.forEach((c) => { const on = c === card; c.classList.toggle('active', on); c.setAttribute('aria-checked', String(on)); });
  }));
})();
