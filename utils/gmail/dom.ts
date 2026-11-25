/**
 * Low-level Gmail DOM helpers. Runs in the page's MAIN world.
 * Gmail class names are obfuscated but have been stable for years; they mirror
 * the selectors CMDK relies on.
 */

export const SYNTHETIC = '__gmailPlusSynthetic';

type KeySpec = { keyCode: number; shift?: boolean; ctrl?: boolean; charCode: number };

/** Gmail's native single-key shortcuts (requires "Keyboard shortcuts on" in Gmail settings). */
export const GMAIL = {
  archive: { keyCode: 69, charCode: 101 },
  delete: { keyCode: 51, shift: true, charCode: 35 },
  reply: { keyCode: 82, charCode: 114 },
  replyAll: { keyCode: 65, charCode: 97 },
  forward: { keyCode: 70, charCode: 102 },
  snooze: { keyCode: 66, charCode: 98 },
  read: { keyCode: 73, shift: true, charCode: 73 },
  unread: { keyCode: 85, shift: true, charCode: 85 },
  select: { keyCode: 88, charCode: 120 },
  undo: { keyCode: 90, charCode: 122 },
  star: { keyCode: 83, charCode: 115 },
  open: { keyCode: 79, charCode: 111 },
  spam: { keyCode: 49, shift: true, charCode: 33 },
  older: { keyCode: 74, charCode: 106 },
  newer: { keyCode: 75, charCode: 107 },
  nextMessage: { keyCode: 78, charCode: 110 },
  prevMessage: { keyCode: 80, charCode: 112 },
  label: { keyCode: 76, charCode: 108 },
  move: { keyCode: 86, charCode: 118 },
  back: { keyCode: 85, charCode: 117 },
  asterisk: { keyCode: 56, shift: true, charCode: 42 },
  a: { keyCode: 65, charCode: 97 },
  n: { keyCode: 78, charCode: 110 },
  g: { keyCode: 71, charCode: 103 },
  p: { keyCode: 80, charCode: 112 },
} satisfies Record<string, KeySpec>;

export type GmailKey = keyof typeof GMAIL;

function keyTarget(): Element {
  return (
    document.querySelector('[role="main"]') ||
    document.querySelector('.nH.bkK') ||
    document.querySelector('.nH.nn') ||
    document.body
  );
}

function makeKeyEvent(type: 'keydown' | 'keypress', spec: KeySpec): KeyboardEvent {
  const code = type === 'keydown' ? spec.keyCode : spec.charCode;
  const charCode = type === 'keypress' ? spec.charCode : 0;
  const key = String.fromCharCode(spec.charCode);
  const ev = new KeyboardEvent(type, {
    key,
    shiftKey: !!spec.shift,
    ctrlKey: !!spec.ctrl,
    bubbles: true,
    cancelable: true,
  });
  // keyCode/which/charCode can't be set via the constructor in Firefox.
  Object.defineProperty(ev, 'keyCode', { get: () => code });
  Object.defineProperty(ev, 'which', { get: () => code });
  Object.defineProperty(ev, 'charCode', { get: () => charCode });
  Object.defineProperty(ev, SYNTHETIC, { value: true });
  return ev;
}

/** Dispatch one of Gmail's native shortcuts. */
export function sendGmail(name: GmailKey): void {
  const spec = GMAIL[name] as KeySpec;
  const target = keyTarget();
  target.dispatchEvent(makeKeyEvent('keydown', spec));
  target.dispatchEvent(makeKeyEvent('keypress', spec));
}

export function sendSequence(names: GmailKey[], delay = 50): void {
  names.forEach((n, i) => setTimeout(() => sendGmail(n), i * delay));
}

export function isSynthetic(e: Event): boolean {
  return (e as any)[SYNTHETIC] === true;
}

/** Full mouse click sequence, which Gmail's custom buttons need. */
export function mouseClick(el: Element | null | undefined, shiftKey = false): boolean {
  if (!el) return false;
  for (const type of ['mouseover', 'mousedown', 'mouseup', 'click', 'mouseout']) {
    el.dispatchEvent(new MouseEvent(type, { view: window, bubbles: true, cancelable: true, shiftKey }));
  }
  return true;
}

/** mousedown/mouseup/mouseout, used for Gmail toolbar buttons and menu items. */
export function pressButton(el: Element | null | undefined): boolean {
  if (!el) return false;
  for (const type of ['mousedown', 'mouseup', 'mouseout']) {
    el.dispatchEvent(new MouseEvent(type, { view: window, bubbles: true, cancelable: type !== 'mousedown' }));
  }
  return true;
}

export function isVisible(el: Element | null | undefined): el is HTMLElement {
  return !!el && (el as HTMLElement).offsetParent !== null && el.getClientRects().length > 0;
}

export function firstVisible(selector: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isVisible) ?? null;
}

// ---------------------------------------------------------------------------
// View detection

const ACTIVE_LIST = "div[role='main'] .ae4:not([style*='none']) .Cp";

export function listRows(): HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>(`${ACTIVE_LIST} tr.zA:not(.aps):not(.advert)`));
}

export function cursorRow(): HTMLTableRowElement | null {
  return document.querySelector(`${ACTIVE_LIST} tr.btb:not(.aps):not(.advert)`);
}

export function rowCheckbox(row: Element | null | undefined): HTMLElement | null {
  return row?.querySelector<HTMLElement>("[role='checkbox']") || row?.querySelector<HTMLElement>('.oZ-jc') || null;
}

export function hasSelection(): boolean {
  return document.getElementsByClassName('x7').length > 0;
}

export function isUnread(row: Element | null | undefined): boolean {
  return !!row && row.classList.contains('zE');
}

/** True when viewing an email list (not an open thread). */
export function isListView(): boolean {
  const header = document.querySelector('.aDP .aia') || document.querySelector('.h7');
  const body = document.querySelector('.aDP .a3s') || document.querySelector('.a3s');
  const parts = window.location.hash.split('/');
  const p0 = parts[0] ?? '';
  const noThread = !header || !body || (header as HTMLElement).offsetParent === null;
  if (parts.length > 1) {
    if (parts.length === 2 && ['#category', '#label', '#advanced-search', '#search'].includes(p0)) return noThread;
    return /^p\d+$/.test(parts[parts.length - 1] ?? '');
  }
  return noThread;
}

export function isSplitPane(): boolean {
  const header = document.querySelector('.aDP .aia') || document.querySelector('.h7');
  const body = document.querySelector('.aDP .a3s') || document.querySelector('.a3s');
  if (!(header && body && (header as HTMLElement).offsetParent !== null)) return false;
  const parts = window.location.hash.split('/');
  return parts.length <= 1 || (parts.length === 2 && ['#category', '#label', '#advanced-search', '#search'].includes(parts[0] ?? ''));
}

/** Hash routes where Gmail's "v" means "Move to" rather than "Move to Inbox". */
export function isInboxLikeView(): boolean {
  const h = window.location.hash;
  return ['#inbox', '#trash', '#imp', '#snoozed', '#spam', '#category', '#label'].some((p) => h.startsWith(p));
}

export function threadMessageCount(): number {
  const main = document.querySelector("div[role='main']");
  return main ? main.querySelectorAll('.kv, .gs').length || 1 : 0;
}

/** Gmail's own modal dialogs (not compose windows). */
export function isGmailModalOpen(): boolean {
  return Array.from(
    document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]'),
  ).some((d) => {
    const r = d.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

export function isFullComposeOpen(): boolean {
  return Array.from(document.querySelectorAll('.aLF-aPX[role="dialog"]')).some(isVisible);
}

export function hasTextSelection(): boolean {
  const s = window.getSelection();
  return !!s && s.toString().length > 0;
}

export function isInCompose(el: EventTarget | null): boolean {
  return !!(el as Element | null)?.closest?.('.M9, .aXw');
}

export function isTypingTarget(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || isInCompose(t);
}

export function currentAccountEmail(): string | null {
  const m = document.title.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (m) return m[0];
  const label = document.querySelector('a[aria-label*="@"]')?.getAttribute('aria-label') ?? '';
  return label.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] ?? null;
}

export function setHash(hash: string): void {
  window.location.hash = hash;
}

// ---------------------------------------------------------------------------
// Toasts

let toastEl: HTMLDivElement | null = null;
let toastTimer: number | undefined;

export function toast(message: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'gmail-plus-toast';
    Object.assign(toastEl.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      padding: '10px 16px',
      borderRadius: '8px',
      font: '500 14px "Google Sans", Roboto, Arial, sans-serif',
      color: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,.25)',
      transition: 'opacity .2s',
      pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(toastEl);
  }
  toastEl.style.background = kind === 'error' ? '#b3261e' : kind === 'success' ? '#1e6b3a' : '#323232';
  toastEl.textContent = message;
  toastEl.style.opacity = '1';
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (toastEl) toastEl.style.opacity = '0';
  }, 3000);
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 2000, interval = 50): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const v = fn();
    if (v) return v;
    await sleep(interval);
  }
  return null;
}
