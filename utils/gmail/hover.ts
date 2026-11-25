import { hasSelection, rowCheckbox, sendGmail } from './dom';

/**
 * Tracks the email row under the mouse pointer so shortcuts can act on it
 * (port of CMDK's pointer-row tracker).
 */
const HOVER_CLASS = 'gmail-plus-hover-target';
const NAV_KEYS = new Set(['j', 'k', 'ArrowDown', 'ArrowUp']);

let current: { row: HTMLTableRowElement; threadId: string | null } | null = null;
let suppressedByKeyboard = false;
let lastMouse: { x: number; y: number } | null = null;
let observer: MutationObserver | null = null;

const threadIdOf = (row: Element) => row.querySelector('span[data-thread-id]')?.getAttribute('data-thread-id') ?? null;

function isStale(c: NonNullable<typeof current>) {
  return !c.row.isConnected || !c.row.classList.contains('zA') || (!!c.threadId && threadIdOf(c.row) !== c.threadId);
}

function clear() {
  observer?.disconnect();
  if (current?.row.isConnected) current.row.classList.remove(HOVER_CLASS);
  current = null;
}

function set(row: HTMLTableRowElement) {
  if (current?.row && current.row !== row && current.row.isConnected) current.row.classList.remove(HOVER_CLASS);
  current = { row, threadId: threadIdOf(row) };
  row.classList.add(HOVER_CLASS);
  observer ??= new MutationObserver(() => {
    if (!current) return;
    if (isStale(current)) clear();
    else if (!current.row.classList.contains(HOVER_CLASS)) current.row.classList.add(HOVER_CLASS);
  });
  observer.disconnect();
  observer.observe(row, { attributes: true, attributeFilter: ['class'] });
}

function track(e: MouseEvent) {
  if (!hoverEnabled) return;
  const t = e.target as Node | null;
  const el = t ? (t.nodeType === 1 ? (t as Element) : t.parentElement) : null;
  const row = el?.closest<HTMLTableRowElement>('tr.zA') ?? null;
  if (!row || row.classList.contains('aps') || row.classList.contains('advert')) {
    if (current) clear();
    return;
  }
  if (current?.row !== row) rowCheckbox(row) ? set(row) : current && clear();
}

export function startHoverTracking() {
  document.addEventListener('mouseover', (e) => !suppressedByKeyboard && track(e), true);
  document.addEventListener(
    'mousemove',
    (e) => {
      const moved = !lastMouse || lastMouse.x !== e.screenX || lastMouse.y !== e.screenY;
      lastMouse = { x: e.screenX, y: e.screenY };
      if (suppressedByKeyboard && moved) {
        suppressedByKeyboard = false;
        track(e);
      }
    },
    { capture: true, passive: true },
  );
  // Keyboard navigation (j/k/arrows) hands control back to Gmail's cursor.
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key?.length === 1 ? e.key.toLowerCase() : e.key;
      const t = e.target as HTMLElement | null;
      if (NAV_KEYS.has(key) && !(t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'))) {
        suppressedByKeyboard = true;
        clear();
      }
    },
    true,
  );
}

let hoverEnabled = false; // set from settings (off by default)

/** "Select emails on hover": when off, shortcuts act only on selection / Gmail's cursor. */
export function setHoverEnabled(enabled: boolean) {
  hoverEnabled = enabled;
  if (!enabled) clear();
}

export function hoveredRow(): HTMLTableRowElement | null {
  if (!hoverEnabled || !current) return null;
  if (isStale(current)) {
    clear();
    return null;
  }
  return current.row.closest("div[role='main'] .ae4:not([style*='none'])") ? current.row : null;
}

/**
 * Make sure the email to act on is selected. Returns how it was targeted:
 * an existing selection, the hovered row, or Gmail's keyboard cursor.
 */
export function armTarget(): 'selection' | 'pointer' | 'cursor' {
  if (hasSelection()) return 'selection';
  const row = hoveredRow();
  const cb = rowCheckbox(row);
  if (row && cb) {
    const checked = cb.getAttribute('aria-checked') === 'true' || row.classList.contains('x7');
    if (!checked) cb.click();
    return 'pointer';
  }
  sendGmail('select');
  return 'cursor';
}

/** Toggle selection of the hovered row (falls back to Gmail's "x"). */
export function toggleHovered(): void {
  const cb = rowCheckbox(hoveredRow());
  if (cb) cb.click();
  else sendGmail('select');
}

/** The single row an action would target (for read/unread decisions). */
export function targetRow(): HTMLTableRowElement | null {
  if (hasSelection()) {
    const sel = document.querySelectorAll<HTMLTableRowElement>('tr.zA.x7');
    return sel.length === 1 ? (sel[0] ?? null) : null;
  }
  return hoveredRow() ?? document.querySelector("div[role='main'] .ae4:not([style*='none']) .Cp tr.btb:not(.aps):not(.advert)");
}
