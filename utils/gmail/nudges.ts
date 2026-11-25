import { isEnabled, type ShortcutId, type ShortcutSettings } from '@/utils/shortcuts';

/**
 * Keyboard shortcut nudges (port of CMDK's "Show Keyboard Shortcut Nudges"):
 * hovering a Gmail button shows "Press <key>" instead of Gmail's tooltip.
 */

const isMac = /Mac/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

type Nudge = {
  keys: string | ((s: ShortcutSettings) => string | null);
  /** Used when Gmail exposes no label for the element. */
  name?: string | ((el: HTMLElement) => string);
};

// Gmail marks starred stars with T-KT-Jp.
const starName = (el: HTMLElement) =>
  el.classList.contains('T-KT-Jp') || el.querySelector('.T-KT-Jp') ? 'Starred' : 'Not starred';

/** Picks our key when the matching GG shortcut is on, else Gmail's native key. */
const ours = (id: ShortcutId, ourKey: string, nativeKey: string | null) => (s: ShortcutSettings) =>
  isEnabled(s, id) ? ourKey : nativeKey;

const NUDGES: Record<string, Nudge> = {
  // Toolbar
  "div[act='19']": { keys: ours('ESCAPE_SMART', 'Esc', 'U') },
  "div[act='7']": { keys: 'E' },
  "div[act='10']": { keys: ours('DELETE_KEY', 'Del', '#') },
  "div[act='2']": { keys: ours('TOGGLE_UNREAD', 'U', 'Shift + U') },
  "div[act='1']": { keys: 'Shift + I' },
  "div[act='290']": { keys: 'B' },
  "div[act='9']": { keys: '!' },
  'div.G-tF > :nth-child(4) > :nth-child(1)': { keys: 'V' },
  'div.G-tF > :nth-child(4) > :nth-child(2)': { keys: 'L' },
  '.nf': { keys: '.' },
  '.VJ': { keys: 'Shift + T' },
  '.Ca': { keys: ours('UNSUBSCRIBE', `${MOD} + U`, null) },
  // Thread / list paging
  'div.adF .h0 > :nth-child(2)': { keys: ours('ARROW_LEFT', '←', 'K') },
  'div.adF .h0 > :nth-child(3)': { keys: ours('ARROW_RIGHT', '→', 'J') },
  'span.Di :nth-child(2)': { keys: ours('ARROW_LEFT', '←', 'G + P') },
  'span.Di :nth-child(3)': { keys: ours('ARROW_RIGHT', '→', 'G + N') },
  // RSVP
  'div.aRm > span > :nth-child(1)': { keys: ours('RSVP_YES', 'Shift + Y', null) },
  'div.aRm > span > :nth-child(2)': { keys: ours('RSVP_MAYBE', 'Shift + M', null) },
  'div.aRm > span > :nth-child(3)': { keys: ours('RSVP_NO', 'Shift + N', null) },
  'div.oEssId > :nth-child(1)': { keys: ours('RSVP_YES', 'Shift + Y', null) },
  'div.oEssId > :nth-child(2)': { keys: ours('RSVP_NO', 'Shift + N', null) },
  'div.oEssId > :nth-child(3)': { keys: ours('RSVP_MAYBE', 'Shift + M', null) },
  'button.bzq.bzr.iVIPM': { keys: ours('RSVP_YES', 'Shift + Y', null) },
  // Navigation
  'div.T-I-KE': { keys: 'C' },
  '.aHS-bnt': { keys: 'G + I' },
  '.aHS-bnu': { keys: 'G + T' },
  '.aHS-bnq': { keys: 'G + D' },
  '.aHS-aHO': { keys: 'G + A' },
  '.aHS-bnw': { keys: 'G + S' },
  '.aHS-bu1': { keys: 'G + B' },
  "form[role='search'] .gb_pe": { keys: '/' },
  // Message actions
  '.aaq': { keys: 'R' },
  '.bkH': { keys: 'R' },
  '#r': { keys: 'R' },
  '.bkI': { keys: 'A' },
  '#r2': { keys: 'A' },
  '.bkG': { keys: 'F' },
  '#r3': { keys: 'F' },
  "[role='grid'] .btb .aXw.T-KT": { keys: 'S', name: starName },
  "[role='grid'] .btb [role='checkbox']": { keys: 'X', name: 'Select' },
  '.acZ .T-KT': { keys: 'S', name: starName },
  // Compose
  '.aoO': { keys: `${MOD} + Enter` },
  '.q8NmZb': { keys: ours('SCHEDULE_SEND', `${MOD} + Shift + L`, null) },
  '.og': { keys: `${MOD} + Shift + D` },
  '.pE': { keys: `${MOD} + Shift + C` },
  '.pB': { keys: `${MOD} + Shift + B` },
};

const LINK_HINT = '⚡ Select text and paste a URL to hyperlink it.';
const ATTRS = [
  ['title', 'gpOrigTitle'],
  ['aria-label', 'gpOrigAriaLabel'],
  ['data-tooltip', 'gpOrigTooltip'],
] as const;

let tip: HTMLDivElement | null = null;
let style: HTMLStyleElement | null = null;
let active: HTMLElement | null = null;
let listening = false;
let getSettings: () => ShortcutSettings = () => ({});

const NUDGING = 'gmail-plus-nudging';

// Gmail's own tooltip popups (.T-ays, [role=tooltip]) stay hidden while a nudge shows.
const CSS = `
html.${NUDGING} .T-ays, html.${NUDGING} [role="tooltip"]:not(.gmail-plus-nudge){display:none!important}
.gmail-plus-nudge{position:fixed;display:none;background:#202124;color:#fff;border-radius:6px;padding:10px 14px;z-index:10000000;
  font:400 13px 'Google Sans',Roboto,Arial,sans-serif;letter-spacing:.2px;box-shadow:0 2px 8px rgba(0,0,0,.2);opacity:0;
  transition:opacity .2s ease-out;pointer-events:none;max-width:300px;white-space:nowrap}
.gmail-plus-nudge.visible{display:block;opacity:.98}
.gmail-plus-nudge.link{background:#333;border-radius:4px;padding:6px 12px;box-shadow:none;opacity:1}
.gmail-plus-nudge .name{margin-right:6px}
.gmail-plus-nudge kbd{display:inline-block;padding:3px 8px;margin:0 3px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);
  border-radius:4px;font:500 12px 'Google Sans Mono',monospace;letter-spacing:0}`;

/** Hide Gmail's own tooltip while ours is showing. */
/** The element and its descendants that carry a tooltip attribute. */
function tooltipCarriers(el: HTMLElement): HTMLElement[] {
  return [el, ...Array.from(el.querySelectorAll<HTMLElement>('[data-tooltip],[aria-label],[title]'))];
}

function stash(el: HTMLElement) {
  for (const node of tooltipCarriers(el)) {
    for (const [attr, key] of ATTRS) {
      const v = node.getAttribute(attr);
      if (v) {
        node.dataset[key] = v;
        node.removeAttribute(attr);
      }
    }
  }
}

function restore(el: HTMLElement | null) {
  if (!el) return;
  const stashed = [el, ...Array.from(el.querySelectorAll<HTMLElement>('[data-gp-orig-title],[data-gp-orig-aria-label],[data-gp-orig-tooltip]'))];
  for (const node of stashed) {
    for (const [attr, key] of ATTRS) {
      const v = node.dataset[key];
      if (v) {
        node.setAttribute(attr, v);
        delete node.dataset[key];
      }
    }
  }
}

function hide() {
  tip?.classList.remove('visible');
  document.documentElement.classList.remove(NUDGING);
  restore(active);
  active = null;
}

/** Gmail's own tooltip text for the element (read before it is stashed). */
function gmailLabel(el: HTMLElement): string {
  const own = (e: Element) => e.getAttribute('data-tooltip') || e.getAttribute('aria-label') || e.getAttribute('title');
  const child = el.querySelector('[data-tooltip],[aria-label],[title]');
  const raw = own(el) || (child && own(child)) || el.textContent || '';
  // Gmail often appends its own shortcut, e.g. "Archive (e)" — drop it.
  return raw.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function render(name: string, keys: string) {
  const el = tip!;
  el.replaceChildren();
  if (name) {
    const n = document.createElement('span');
    n.className = 'name';
    n.textContent = name;
    el.append(n);
  }
  keys.split(/\s*\+\s*/).forEach((part, i) => {
    if (i) el.append(' + ');
    const k = document.createElement('kbd');
    k.textContent = part;
    el.append(k);
  });
}

function placeAtCursor(e: MouseEvent) {
  const el = tip!;
  el.style.transform = 'none';
  el.style.left = `${e.clientX}px`;
  el.style.top = `${e.clientY + 20}px`;
  const r = el.getBoundingClientRect();
  if (r.right > window.innerWidth) el.style.left = `${e.clientX - r.width}px`;
}

function placeAbove(target: Element) {
  const el = tip!;
  const t = target.getBoundingClientRect();
  el.style.left = `${t.left + t.width / 2}px`;
  el.style.transform = 'translateX(-50%)';
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    el.style.top = `${t.top - r.height - 8}px`;
    if (r.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - r.width - 10}px`;
      el.style.transform = 'none';
    }
    if (r.left < 0) {
      el.style.left = '10px';
      el.style.transform = 'none';
    }
  });
}

function match(
  start: Element | null,
): { el: HTMLElement; keys: string | null; link?: boolean; fallback?: Nudge['name'] } | null {
  const s = getSettings();
  for (let el = start; el; el = el.parentElement) {
    if (el.getAttribute('command') === '+link') {
      return isEnabled(s, 'PASTE_AS_LINK') ? { el: el as HTMLElement, keys: null, link: true } : null;
    }
    for (const sel in NUDGES) {
      if (el.matches(sel)) {
        const n = NUDGES[sel]!;
        const keys = typeof n.keys === 'function' ? n.keys(s) : n.keys;
        return keys ? { el: el as HTMLElement, keys, fallback: n.name } : null;
      }
    }
  }
  return null;
}

function onEvent(e: MouseEvent) {
  if (!tip) return;
  if ((e.type === 'mousedown' || e.type === 'click') && tip.classList.contains('visible')) return hide();
  const target = e.target as Element | null;
  if (!target?.closest || target.closest('#gmail-plus-toast')) return;
  const m = match(target);
  if (!m) {
    if (e.type === 'mouseover' && tip.classList.contains('visible')) hide();
    return;
  }
  if (e.type === 'mouseout') return hide();
  if (e.type !== 'mouseover') return;
  if (active && active !== m.el) restore(active);
  // Re-hovering the same element: its label is already stashed in dataset.
  const name =
    active === m.el
      ? (m.el.dataset.gpOrigTooltip || m.el.dataset.gpOrigAriaLabel || m.el.dataset.gpOrigTitle || '').replace(/\s*\([^)]*\)\s*$/, '').trim()
      : gmailLabel(m.el);
  const label =
    name || (typeof m.fallback === 'function' ? m.fallback(m.el) : (m.fallback ?? ''));
  active = m.el;
  stash(m.el);
  if (m.link) {
    tip.textContent = LINK_HINT;
    tip.classList.add('link');
    placeAbove(m.el);
  } else {
    render(label, m.keys!);
    tip.classList.remove('link');
    placeAtCursor(e);
  }
  tip.classList.add('visible');
  document.documentElement.classList.add(NUDGING);
}

const EVENTS = ['mouseover', 'mouseout', 'mousedown', 'click'] as const;

export function setNudgesEnabled(enabled: boolean, settings: () => ShortcutSettings) {
  getSettings = settings;
  if (enabled && !listening) {
    if (!document.body) return; // called again once the page loads
    style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    tip = document.createElement('div');
    tip.className = 'gmail-plus-nudge';
    document.body.appendChild(tip);
    EVENTS.forEach((t) => document.addEventListener(t, onEvent, true));
    listening = true;
  } else if (!enabled && listening) {
    EVENTS.forEach((t) => document.removeEventListener(t, onEvent, true));
    hide();
    tip?.remove();
    style?.remove();
    tip = null;
    style = null;
    listening = false;
  }
}
