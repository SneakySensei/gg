import '@/assets/appearance.css';
import { APPEARANCE_DEFS, APPEARANCE_KEY, normalizeAppearance, type AppearanceSettings } from '@/utils/appearance';

/**
 * Applies Appearance switches as classes on <html>. Runs at document_start so
 * hidden parts of Gmail don't flash on screen before being hidden.
 */
export default defineContentScript({
  matches: ['*://mail.google.com/*'],
  runAt: 'document_start',
  async main() {
    let current: AppearanceSettings | null = null;

    const apply = (s: AppearanceSettings) => {
      current = s;
      const root = document.documentElement;
      for (const def of APPEARANCE_DEFS) root.classList.toggle(def.className, s[def.id]);
      if (s.hideUpgradeButton) tagUpgrade();
    };

    // The Upgrade prompt has no stable class, so find it by label/text in the top bar.
    const UPGRADE = /\b(upgrade|get more storage|try google one)\b/i;
    const tagUpgrade = () => {
      const bar = document.querySelector('header, [role="banner"], .gb_Ne');
      if (!bar) return;
      bar.querySelectorAll<HTMLElement>('a, button, [role="button"]').forEach((el) => {
        if (el.hasAttribute('data-gp-upgrade')) return;
        const label = `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`;
        if (UPGRADE.test(label)) el.setAttribute('data-gp-upgrade', '');
      });
    };

    let pending = 0;
    new MutationObserver(() => {
      if (!current?.hideUpgradeButton || pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        tagUpgrade();
      }, 300);
    }).observe(document.documentElement, { childList: true, subtree: true });

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && APPEARANCE_KEY in changes) apply(normalizeAppearance(changes[APPEARANCE_KEY]?.newValue));
    });

    const data = await browser.storage.sync.get(APPEARANCE_KEY);
    apply(normalizeAppearance(data[APPEARANCE_KEY]));
  },
});
