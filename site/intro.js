/* Page-load intro: the logo draws itself in the centre, then flies to the nav logo. */
(() => {
  const html = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) return;
  html.classList.add('intro-on');
  const intro = document.createElement('div');
  intro.className = 'intro';
  intro.setAttribute('aria-hidden', 'true');
  intro.innerHTML = `<div class="intro__glow"></div><div class="intro__logo">
    <svg viewBox="0 0 128 128"><rect width="128" height="128" rx="30" fill="#161618"/>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path class="sl-key" pathLength="1" d="M72 28 H44 A16 16 0 0 0 28 44 V84 A16 16 0 0 0 44 100 H84 A16 16 0 0 0 100 84 V56" stroke="#f5f5f3" stroke-width="8"/>
        <path class="sl-streak" d="M40 88 L70 58" stroke="#398eff" stroke-width="3"/>
        <path class="sl-arrow" pathLength="1" d="M56 72 L100 28" stroke="#398eff" stroke-width="9"/>
        <path class="sl-head" pathLength="1" d="M74 28 H100 V54" stroke="#398eff" stroke-width="9"/>
      </g></svg>
    <span class="intro__ring"></span>
    <span class="intro__spark"><i style="--x:34px;--y:-30px"></i><i style="--x:44px;--y:2px"></i><i style="--x:8px;--y:-46px"></i><i style="--x:26px;--y:22px"></i><i style="--x:-16px;--y:-36px"></i></span>
  </div>`;
  const mount = () => { document.body.appendChild(intro); html.classList.add('intro-mounted'); };
  document.body ? mount() : document.addEventListener('DOMContentLoaded', mount);

  let done = false;
  const finish = () => { if (done) return; done = true; intro.remove(); html.classList.remove('intro-on'); };
  const fly = () => {
    if (done) return;
    const target = document.querySelector('.nav__logo img');
    const logo = intro.querySelector('.intro__logo');
    if (!target) return finish();
    scrollTo(0, 0);
    const a = logo.getBoundingClientRect(), b = target.getBoundingClientRect();
    intro.classList.add('is-flying');
    logo.animate([
      { transform: 'none' },
      { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width})` },
    ], { duration: 750, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' }).finished.then(finish, finish);
  };
  addEventListener('load', () => setTimeout(fly, 2000), { once: true });
  setTimeout(fly, 4000); // never hold the page if load is slow
  addEventListener('pointerdown', fly, { once: true });
  addEventListener('keydown', fly, { once: true });
})();
