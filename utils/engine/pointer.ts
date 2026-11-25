/**
 * Remembers which email row is under the mouse, so hover actions can target it.
 * Moving through the list with the keyboard (j / k / arrows) hands control back
 * to Gmail's own cursor until the mouse actually moves again.
 */
import { isEditable } from './page';

const HOVER_CLASS = 'gg-hover-row';

let enabled = false;
let row: HTMLTableRowElement | null = null;
let keyboardMode = false;
let lastPos = '';

function setRow(next: HTMLTableRowElement | null) {
  if (row === next) return;
  row?.classList.remove(HOVER_CLASS);
  row = next;
  row?.classList.add(HOVER_CLASS);
}

function onPointerOver(e: PointerEvent) {
  if (!enabled || keyboardMode) return;
  const el = e.target instanceof Element ? e.target : null;
  setRow(el?.closest<HTMLTableRowElement>('[role="main"] tr.zA') ?? null);
}

function onPointerMove(e: PointerEvent) {
  const pos = `${e.screenX},${e.screenY}`;
  if (pos === lastPos) return; // Gmail re-renders can fire moves without motion
  lastPos = pos;
  if (keyboardMode) {
    keyboardMode = false;
    onPointerOver(e);
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
  if (['j', 'k', 'J', 'K', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    keyboardMode = true;
    setRow(null);
  }
}

let started = false;

export function startPointerTracking(): void {
  if (started) return;
  started = true;
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
  document.addEventListener('keydown', onKeyDown, true);
}

/** Turns hover targeting on or off ("Select emails on hover"). */
export function setHoverTargeting(on: boolean): void {
  enabled = on;
  if (!on) setRow(null);
}

/** The row under the mouse, if it is still on screen and part of the list. */
export function hoveredRow(): HTMLTableRowElement | null {
  if (!enabled || !row) return null;
  if (!row.isConnected || !row.closest('[role="main"]')) {
    setRow(null);
    return null;
  }
  return row;
}
