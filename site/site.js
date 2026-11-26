/* ===== Set this to the Chrome Web Store listing URL once it is published. =====
   Until then the "Add to Chrome" buttons open a Chrome Web Store search for GG. */
const CHROME_STORE_URL = '';

(() => {
  if (CHROME_STORE_URL) document.querySelectorAll('.js-store').forEach((a) => { a.href = CHROME_STORE_URL; });

  // Appearance window: Minimal while the pointer rests on it, Classic otherwise.
  const frame = document.querySelector('#appearance .frame');
  const win = frame && frame.querySelector('.look-win');
  if (!win) return;
  const name = win.querySelector('[data-look-name]');
  const set = (look) => { win.dataset.look = look; name.textContent = look === 'minimal' ? 'Minimal' : 'Classic'; };
  frame.addEventListener('pointerenter', () => set('minimal'));
  frame.addEventListener('pointerleave', () => set('classic'));
})();
