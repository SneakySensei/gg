/**
 * Reading Gmail's page. Prefers what Gmail shows users (ARIA roles, labels,
 * tooltips, visible text) over generated class names, so it survives Gmail
 * restyles. Labels are matched in English.
 */

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function waitFor<T>(find: () => T | null | undefined | false, timeoutMs = 2000): Promise<T | null> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = find();
    if (v) return v;
    if (Date.now() > end) return null;
    await sleep(50);
  }
}

export function isShown(el: Element | null | undefined): el is HTMLElement {
  if (!el) return false;
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el as HTMLElement).visibility !== 'hidden';
}

const shown = <T extends Element>(els: Iterable<T>) => Array.from(els).filter(isShown) as T[];

export function main(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="main"]');
}

// ---------------------------------------------------------------------------
// Where the user is

export function isEditable(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t || !t.tagName) return false;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

/** An email list is on screen. */
export function hasList(): boolean {
  return rows().length > 0;
}

/** An opened conversation is on screen (alone, or beside the list in split pane). */
export function hasThread(): boolean {
  return shown(main()?.querySelectorAll('[data-message-id]') ?? []).length > 0;
}

/** Split pane: list and conversation visible together. */
export function isSplitPane(): boolean {
  return hasList() && hasThread();
}

/** Gmail's own dialogs (not compose windows) are open. */
export function dialogOpen(): boolean {
  return shown(document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"]')).length > 0;
}

export function hasTextSelection(): boolean {
  return (window.getSelection()?.toString().trim().length ?? 0) > 0;
}

/** Views where Gmail's "v" already means "Move to". */
export function inInboxLikeView(): boolean {
  return /^#(inbox|imp|snoozed|spam|trash|category|label)\b/.test(location.hash || '#inbox');
}

// ---------------------------------------------------------------------------
// The email list

export function rows(): HTMLTableRowElement[] {
  return shown(main()?.querySelectorAll<HTMLTableRowElement>('tr.zA') ?? []);
}

export function checkboxOf(row: Element | null | undefined): HTMLElement | null {
  return row?.querySelector<HTMLElement>('[role="checkbox"]') ?? null;
}

export function isChecked(row: Element): boolean {
  return checkboxOf(row)?.getAttribute('aria-checked') === 'true';
}

export function selectedRows(): HTMLTableRowElement[] {
  return rows().filter(isChecked);
}

export function isUnread(row: Element | null | undefined): boolean {
  return !!row && row.classList.contains('zE');
}

/** Gmail's keyboard cursor row (moved by j / k). */
export function cursorRow(): HTMLTableRowElement | null {
  return rows().find((r) => r.classList.contains('btb')) ?? null;
}

/** A hover-toolbar button on a row, e.g. rowButton(row, 'Archive'). */
export function rowButton(row: Element, label: string): HTMLElement | null {
  return row.querySelector<HTMLElement>(`[data-tooltip="${label}"], [aria-label="${label}"]`);
}

export function rowStar(row: Element): HTMLElement | null {
  return row.querySelector<HTMLElement>('[role="button"][aria-label="Starred"], [role="button"][aria-label="Not starred"]');
}

// ---------------------------------------------------------------------------
// Finding controls by what they say

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Visible clickable element whose label or text equals one of `names`. */
export function findControl(names: string[], scope: ParentNode = document): HTMLElement | null {
  const want = names.map(norm);
  const candidates = scope.querySelectorAll<HTMLElement>('[role="button"], button, [role="menuitem"], [role="link"], a, span[role="link"]');
  for (const el of Array.from(candidates)) {
    if (!isShown(el)) continue;
    const label = norm(el.getAttribute('aria-label') || el.getAttribute('data-tooltip'));
    const text = norm(el.textContent);
    if (want.includes(label) || want.includes(text)) return el;
  }
  return null;
}

/** A realistic click: Gmail's custom buttons listen for mousedown/mouseup. */
export function clickLikeUser(el: Element | null | undefined): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const at = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  el.dispatchEvent(new MouseEvent('mouseover', at));
  el.dispatchEvent(new MouseEvent('mousedown', at));
  el.dispatchEvent(new MouseEvent('mouseup', at));
  el.dispatchEvent(new MouseEvent('click', at));
  return true;
}

// ---------------------------------------------------------------------------
// Conversation and compose

export interface MessageInfo {
  from: string;
  to: string;
  date: string;
  subject: string;
  html: string;
  text: string;
}

/** Expanded messages in the open conversation, oldest first. */
export function openMessages(): MessageInfo[] {
  const subject = main()?.querySelector('h2')?.textContent?.trim() ?? '';
  return shown(main()?.querySelectorAll<HTMLElement>('[data-message-id]') ?? []).flatMap((msg) => {
    const body = msg.querySelector<HTMLElement>('.a3s');
    if (!isShown(body)) return [];
    const person = (el: Element) => {
      const name = el.getAttribute('name') || el.textContent?.trim() || '';
      const email = el.getAttribute('email') || '';
      return email && name && name !== email ? `${name} <${email}>` : email || name;
    };
    const people = Array.from(msg.querySelectorAll('[email]'));
    const [sender, ...recipients] = people;
    const dated = Array.from(msg.querySelectorAll<HTMLElement>('[title]')).find((el) => /\d{4}|\d:\d\d/.test(el.title));
    return [
      {
        from: sender ? person(sender) : '',
        to: recipients.map(person).filter(Boolean).join(', '),
        date: dated?.title ?? '',
        subject,
        html: body.innerHTML,
        text: body.innerText.trim(),
      },
    ];
  });
}

/** The message body editor of the visible compose / reply window. */
export function composeBody(): HTMLElement | null {
  const bodies = shown(
    document.querySelectorAll<HTMLElement>('[contenteditable="true"][aria-label="Message Body"], [contenteditable="true"][role="textbox"][g_editable]'),
  );
  return bodies[bodies.length - 1] ?? null;
}

/** The compose window containing the focused element, or the last one opened. */
export function activeCompose(from: Element | null): HTMLElement | null {
  const own = from?.closest<HTMLElement>('[role="dialog"], [role="region"]');
  if (own?.querySelector('[aria-label="Message Body"]')) return own;
  return composeBody()?.closest<HTMLElement>('[role="dialog"], [role="region"]') ?? null;
}

export function accountEmail(): string | null {
  return document.title.match(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? null;
}
