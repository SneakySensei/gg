/**
 * Shortcut nudges: hovering a Gmail control shows "<its name>  <key>" in place
 * of Gmail's tooltip, so shortcuts are learned while using the mouse.
 *
 * Controls are recognised by the name Gmail gives them (its tooltip or
 * aria-label, e.g. "Archive", "Reply all"), matched in English.
 */
import { isEnabled, type ShortcutId, type ShortcutSettings } from '@/utils/shortcuts';
import { TOAST_ID } from './ui';

const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

/** GG's key when that shortcut is on, otherwise Gmail's own key (or nothing). */
type Keys = string | { gg: ShortcutId; key: string; gmail?: string };

/** Gmail control name (lower-case, exact) → shortcut. */
const BY_NAME: Record<string, Keys> = {
  archive: 'E',
  delete: { gg: 'DELETE_KEY', key: 'Del', gmail: '#' },
  'mark as read': 'Shift + I',
  'mark as unread': { gg: 'TOGGLE_UNREAD', key: 'U', gmail: 'Shift + U' },
  snooze: 'B',
  'report spam': '!',
  'move to': 'V',
  'move to inbox': { gg: 'MOVE_INBOX', key: 'V' },
  labels: 'L',
  'add to tasks': 'Shift + T',
  more: '.',
  'more email options': '.',
  reply: 'R',
  'reply all': 'A',
  forward: 'F',
  compose: 'C',
  'search mail': '/',
  older: { gg: 'ARROW_RIGHT', key: '→', gmail: 'J' },
  newer: { gg: 'ARROW_LEFT', key: '←', gmail: 'K' },
  'back to inbox': { gg: 'ESCAPE_SMART', key: 'Esc', gmail: 'U' },
  'back to search results': { gg: 'ESCAPE_SMART', key: 'Esc', gmail: 'U' },
  starred: 'S',
  'not starred': 'S',
  select: 'X',
  unsubscribe: { gg: 'UNSUBSCRIBE', key: `${MOD} + U` },
  send: `${MOD} + Enter`,
  'schedule send': { gg: 'SCHEDULE_SEND', key: `${MOD} + Shift + L` },
  'attach files': { gg: 'ATTACH_FILE', key: `${MOD} + Shift + A` },
  'discard draft': `${MOD} + Shift + D`,
  'add cc recipients': `${MOD} + Shift + C`,
  'add bcc recipients': `${MOD} + Shift + B`,
};

/** Left-hand navigation links → Gmail's "go to" shortcuts. */
const NAV: Record<string, string> = {
  inbox: 'G + I',
  starred: 'G + S',
  snoozed: 'G + B',
  sent: 'G + T',
  drafts: 'G + D',
  'all mail': 'G + A',
};

const LINK_HINT = 'Select text, then paste a URL to link it';

let getSettings: () => ShortcutSettings = () => ({});
let tip: HTMLDivElement | null = null;
let style: HTMLStyleElement | null = null;
let current: HTMLElement | null = null;

const CSS = `
html.gg-nudging [role="tooltip"]:not(.gg-nudge){display:none!important}
.gg-nudge{position:fixed;z-index:2147483646;display:flex;align-items:center;gap:8px;pointer-events:none;
  padding:7px 10px;border-radius:8px;background:#161618;color:#f5f5f3;font:500 12.5px 'Google Sans',Roboto,Arial,sans-serif;
  box-shadow:0 4px 14px rgba(0,0,0,.22);opacity:0;transform:translateY(2px);transition:opacity .12s,transform .12s;white-space:nowrap}
.gg-nudge.on{opacity:1;transform:none}
.gg-nudge kbd{font:600 11.5px ui-monospace,SFMono-Regular,Consolas,monospace;padding:2px 6px;border-radius:5px;
  background:rgba(57,142,255,.18);color:#9cc5ff;border:1px solid rgba(57,142,255,.35)}
.gg-nudge .gg-plus{opacity:.55}`;

function nameOf(el: Element): string {
  const d = (el as HTMLElement).dataset ?? {};
  // Labels we've temporarily moved into data-gg-* count too (see stash()).
  const label =
    el.getAttribute('data-tooltip') || d.ggTooltip || el.getAttribute('aria-label') || el.getAttribute('title') || d.ggTitle || '';
  // Gmail sometimes appends its own key, e.g. "Archive (e)".
  return label.replace(/\s*\([^)]{1,12}\)\s*$/, '').trim();
}

function keysFor(k: Keys): string | null {
  if (typeof k === 'string') return k;
  return isEnabled(getSettings(), k.gg) ? k.key : (k.gmail ?? null);
}

/** Find the hovered control we have a nudge for. */
function resolve(start: Element): { el: HTMLElement; name: string; keys: string | null; link?: boolean } | null {
  for (let el: Element | null = start; el && el !== document.body; el = el.parentElement) {
    if (el.id === TOAST_ID) return null;
    const name = nameOf(el);
    if (!name) continue;
    const lower = name.toLowerCase();
    if (lower === 'insert link') {
      return isEnabled(getSettings(), 'PASTE_AS_LINK') ? { el: el as HTMLElement, name, keys: null, link: true } : null;
    }
    if (el.closest('[role="navigation"]') && el.tagName === 'A') {
      const nav = Object.entries(NAV).find(([n]) => lower.startsWith(n));
      return nav ? { el: el as HTMLElement, name: nav[0].replace(/\b\w/g, (c) => c.toUpperCase()), keys: nav[1] } : null;
    }
    const entry = BY_NAME[lower];
    if (!entry) return null; // the nearest labelled element isn't one we know
    const keys = keysFor(entry);
    return keys ? { el: el as HTMLElement, name, keys } : null;
  }
  return null;
}

/** Hide Gmail's tooltip text while ours shows; restored on leave. */
function stash(el: HTMLElement) {
  for (const node of [el, ...Array.from(el.querySelectorAll<HTMLElement>('[data-tooltip], [title]'))]) {
    for (const a of ['data-tooltip', 'title'] as const) {
      const v = node.getAttribute(a);
      if (v) {
        node.dataset[`gg${a === 'title' ? 'Title' : 'Tooltip'}`] = v;
        node.removeAttribute(a);
      }
    }
  }
}

function unstash(el: HTMLElement | null) {
  if (!el) return;
  for (const node of [el, ...Array.from(el.querySelectorAll<HTMLElement>('[data-gg-tooltip], [data-gg-title]'))]) {
    if (node.dataset.ggTooltip) node.setAttribute('data-tooltip', node.dataset.ggTooltip);
    if (node.dataset.ggTitle) node.setAttribute('title', node.dataset.ggTitle);
    delete node.dataset.ggTooltip;
    delete node.dataset.ggTitle;
  }
}

function render(name: string, keys: string | null, link?: boolean) {
  const t = tip!;
  t.replaceChildren();
  if (link) {
    t.textContent = LINK_HINT;
    return;
  }
  const label = document.createElement('span');
  label.textContent = name;
  t.append(label);
  keys!.split(/\s*\+\s*/).forEach((k, i) => {
    if (i) {
      const plus = document.createElement('span');
      plus.className = 'gg-plus';
      plus.textContent = '+';
      t.append(plus);
    }
    const kbd = document.createElement('kbd');
    kbd.textContent = k;
    t.append(kbd);
  });
}

function place(anchor: HTMLElement) {
  const t = tip!;
  const a = anchor.getBoundingClientRect();
  const w = t.offsetWidth;
  const h = t.offsetHeight;
  const below = a.bottom + 8 + h < innerHeight;
  t.style.top = `${below ? a.bottom + 8 : a.top - h - 8}px`;
  t.style.left = `${Math.min(Math.max(8, a.left + a.width / 2 - w / 2), innerWidth - w - 8)}px`;
}

function hide() {
  tip?.classList.remove('on');
  document.documentElement.classList.remove('gg-nudging');
  unstash(current);
  current = null;
}

function onOver(e: PointerEvent) {
  const target = e.target instanceof Element ? e.target : null;
  const found = target ? resolve(target) : null;
  if (!found) {
    if (current && !(target && current.contains(target))) hide();
    return;
  }
  if (found.el === current) return;
  hide();
  current = found.el;
  stash(found.el);
  render(found.name, found.keys, found.link);
  tip!.classList.add('on');
  document.documentElement.classList.add('gg-nudging');
  place(found.el);
}

const onDown = () => hide();

export function setNudgesEnabled(enabled: boolean, settings: () => ShortcutSettings): void {
  getSettings = settings;
  if (enabled && !tip) {
    if (!document.body) return; // called again once the page has loaded
    style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    tip = document.createElement('div');
    tip.className = 'gg-nudge';
    tip.setAttribute('role', 'tooltip');
    document.body.append(tip);
    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('blur', onDown);
  } else if (!enabled && tip) {
    document.removeEventListener('pointerover', onOver, true);
    document.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('blur', onDown);
    hide();
    tip.remove();
    style?.remove();
    tip = null;
    style = null;
  }
}
