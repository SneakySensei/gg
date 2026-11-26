/* ===== PLACEHOLDER: set this to the Chrome Web Store listing URL once it is published. ===== */
const CHROME_STORE_URL = ''; // e.g. 'https://chromewebstore.google.com/detail/<extension-id>'

(() => {
  if (CHROME_STORE_URL) document.querySelectorAll('.js-store').forEach((a) => { a.href = CHROME_STORE_URL; a.rel = 'noopener'; });

  // Glyphs: the settings page's set (entrypoints/options/main.ts), 1.75 stroke, plus a few site-only ones.
  const GLYPHS = {
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    panels: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M3.5 9.5h17M9 9.5v10"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>',
    burst: '<path d="M7 17 17 7M9.5 7H17v7.5"/>',
    spark: '<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6.5 6.5l2.2 2.2M15.3 15.3l2.2 2.2M6.5 17.5l2.2-2.2M15.3 8.7l2.2-2.2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/>',
    pointer: '<path d="M6 3.5 19 10l-5.8 1.8L11 18 6 3.5Z"/>',
    topbar: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M3.5 9h17M6.5 6.8h.01M9 6.8h.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    shield: '<path d="M12 3.5 5 6.5v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9v-5z"/><path d="m9 12 2 2 4-4"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    archive: '<rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5"/><path d="M5 9v8.5A2 2 0 0 0 7 19.5h10a2 2 0 0 0 2-2V9M10 13h4"/>',
    trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 12.5h9l1-12.5M9.5 7V4.5h5V7"/>',
    clock: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 2M5 4 3 6M19 4l2 2"/>',
    tag: '<path d="M3.5 12V4.5H11l9.5 9.5-7 7z"/><circle cx="7.8" cy="8.8" r="1.2"/>',
    reply: '<path d="M10 7.5 4.5 12.5l5.5 5M4.5 12.5h9.5a6 6 0 0 1 6 6"/>',
    server: '<rect x="4" y="4.5" width="16" height="6" rx="2"/><rect x="4" y="13.5" width="16" height="6" rx="2"/><path d="M4 4 20 20"/>',
    chart: '<path d="M5 19.5V11M10 19.5V5M15 19.5v-7M20 19.5H4"/><path d="M4 4 20 20"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5M12 3.5C9.5 6 8.5 9 8.5 12s1 6 3.5 8.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  };
  const fill = (s, name) => { s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[name] || GLYPHS.keyboard}</svg>`; };
  document.querySelectorAll('[data-glyph]').forEach((s) => fill(s, s.dataset.glyph));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Hero: the settings splash choreography (.splash.play + gg-* keyframes), plus streak/sparks/ring.
  const hero = document.getElementById('hero');
  // Opened in a background tab or with reduced motion: show the finished hero (the no-JS styles).
  if (reduce || document.hidden) document.documentElement.classList.remove('js');
  else { void hero.offsetWidth; hero.classList.add('play'); }
  const logoBtn = hero.querySelector('.logo-btn');
  const again = () => { logoBtn.classList.remove('again'); void logoBtn.offsetWidth; logoBtn.classList.add('again'); };
  logoBtn.addEventListener('click', again);
  const heroKeys = [...hero.querySelectorAll('.keys kbd')];
  addEventListener('keydown', (e) => {
    if (reduce || e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea')) return;
    const k = heroKeys.find((x) => x.textContent.toLowerCase() === e.key.toLowerCase());
    if (k && scrollY < innerHeight * .8) { k.classList.remove('hit'); void k.offsetWidth; k.classList.add('hit'); again(); }
  });

})();
