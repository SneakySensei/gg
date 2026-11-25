/**
 * Keyboard helpers for GG's engine (runs in the page's MAIN world).
 *
 * - `chordOf(event)` turns a real keydown into a layout-independent chord
 *   string such as "e", "shift+3", "mod+shift+l" or "alt+/".
 * - `press("shift+i")` sends one of Gmail's own documented keyboard shortcuts
 *   as a synthetic key event, marked so GG's own listener ignores it.
 */

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);

/** Marks events GG creates itself. */
const SYNTHETIC = '__ggSynthetic';

export function isSynthetic(e: Event): boolean {
  return (e as unknown as Record<string, unknown>)[SYNTHETIC] === true;
}

// ---------------------------------------------------------------------------
// Reading real key presses

const CODE_TOKENS: Record<string, string> = {
  Slash: '/',
  Backquote: '`',
  Period: '.',
  Comma: ',',
  Minus: '-',
  Equal: '=',
  Enter: 'enter',
  NumpadEnter: 'enter',
  Escape: 'esc',
  Delete: 'del',
  Backspace: 'backspace',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Tab: 'tab',
};

/** Base key of an event, from the physical key so Shift doesn't change it. */
function baseKey(e: KeyboardEvent): string | null {
  const code = e.code || '';
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (code in CODE_TOKENS) return CODE_TOKENS[code]!;
  // Fallbacks for events without `code` (some synthetic or IME cases).
  const k = e.key;
  if (!k) return null;
  if (k === 'Escape') return 'esc';
  if (k.length === 1) return k.toLowerCase();
  return null;
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'OS', 'CapsLock']);

/** Chord string for a keydown, or null for bare modifier presses. */
export function chordOf(e: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;
  const key = baseKey(e);
  if (!key) return null;
  const mod = IS_MAC ? e.metaKey : e.ctrlKey;
  const parts: string[] = [];
  if (mod) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  parts.push(key);
  return parts.join('+');
}

// ---------------------------------------------------------------------------
// Sending Gmail's own shortcuts

interface KeySpec {
  keyCode: number;
  char: string;
  shift: boolean;
}

const SHIFTED_SYMBOLS: Record<string, number> = { '#': 51, '!': 49, '*': 56 };

function specFor(name: string): KeySpec {
  if (name in SHIFTED_SYMBOLS) return { keyCode: SHIFTED_SYMBOLS[name]!, char: name, shift: true };
  const shift = name.startsWith('shift+');
  const key = shift ? name.slice('shift+'.length) : name;
  if (key === 'enter') return { keyCode: 13, char: '\r', shift };
  return { keyCode: key.toUpperCase().charCodeAt(0), char: shift ? key.toUpperCase() : key, shift };
}

function keyEvent(type: string, s: KeySpec): KeyboardEvent {
  const ev = new KeyboardEvent(type, { key: s.char, shiftKey: s.shift, bubbles: true, cancelable: true });
  // Legacy fields Gmail reads; the constructor can't set them in every browser.
  const legacy = type === 'keypress' ? s.char.charCodeAt(0) : s.keyCode;
  Object.defineProperty(ev, 'keyCode', { get: () => legacy });
  Object.defineProperty(ev, 'which', { get: () => legacy });
  Object.defineProperty(ev, 'charCode', { get: () => (type === 'keypress' ? s.char.charCodeAt(0) : 0) });
  Object.defineProperty(ev, SYNTHETIC, { value: true });
  return ev;
}

function isEditable(el: Element | null): boolean {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
}

/** Send one Gmail shortcut key, e.g. press('e'), press('#'), press('shift+i'). */
export function press(name: string): void {
  const s = specFor(name);
  const active = document.activeElement;
  const target = active && !isEditable(active) ? active : document.body;
  for (const type of ['keydown', 'keypress', 'keyup']) target.dispatchEvent(keyEvent(type, s));
}

const tick = () => new Promise<void>((r) => setTimeout(r, 30));

/** Send several keys in order, with a short pause between them. */
export async function pressAll(...names: string[]): Promise<void> {
  for (const n of names) {
    press(n);
    await tick();
  }
}
