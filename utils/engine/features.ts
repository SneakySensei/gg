/**
 * What GG's shortcuts do. Each function returns `true` when it handled the key,
 * or `false` to let Gmail's own shortcut run unchanged.
 */
import { press, pressAll } from './keys';
import {
  accountEmail,
  activeCompose,
  checkboxOf,
  clickLikeUser,
  composeBody,
  cursorRow,
  findControl,
  hasThread,
  isChecked,
  isUnread,
  main,
  openMessages,
  rowButton,
  rows,
  rowStar,
  selectedRows,
  sleep,
  waitFor,
} from './page';
import { copyRich, escapeHtml, toast } from './ui';

// ---------------------------------------------------------------------------
// Acting on the email under the mouse

/** Tick a row's checkbox so Gmail's own shortcut applies to exactly that row. */
function selectOnly(row: HTMLTableRowElement): boolean {
  const box = checkboxOf(row);
  if (!box) return false;
  if (!isChecked(row)) box.click();
  return true;
}

/** Click one of the row's hover buttons, or fall back to tick + Gmail key. */
export function rowAction(row: HTMLTableRowElement, label: string, fallbackKey: string): boolean {
  const button = rowButton(row, label);
  if (button) return clickLikeUser(button);
  if (!selectOnly(row)) return false;
  press(fallbackKey);
  return true;
}

export function rowToggleRead(row: HTMLTableRowElement): boolean {
  return isUnread(row) ? rowAction(row, 'Mark as read', 'shift+i') : rowAction(row, 'Mark as unread', 'shift+u');
}

export function rowStarToggle(row: HTMLTableRowElement): boolean {
  const star = rowStar(row);
  if (star) return clickLikeUser(star);
  if (!selectOnly(row)) return false;
  press('s');
  return true;
}

/** Tick the row, then send a Gmail key that needs a selection (label, spam, move). */
export function rowWithKey(row: HTMLTableRowElement, key: string): boolean {
  if (!selectOnly(row)) return false;
  press(key);
  return true;
}

/** Open the row's conversation, then reply / reply all / forward. */
export async function rowOpenThen(row: HTMLTableRowElement, key: 'r' | 'a' | 'f'): Promise<void> {
  clickLikeUser(row); // clicking the middle of a row opens its conversation
  if (await waitFor(hasThread, 3000)) {
    await sleep(120);
    press(key);
  }
}

export async function archiveMarkingRead(row: HTMLTableRowElement | null): Promise<void> {
  if (row) {
    if (isUnread(row)) rowAction(row, 'Mark as read', 'shift+i');
    await sleep(120);
    if (row.isConnected) rowAction(row, 'Archive', 'e');
    return;
  }
  // Selection, cursor row or open conversation: mark read, then archive.
  await pressAll('shift+i', 'e');
}

/** Toggle read state of the current selection as a whole. */
export function toggleReadSelection(): boolean {
  const selected = selectedRows();
  if (!selected.length) return false;
  press(selected.some(isUnread) ? 'shift+i' : 'shift+u');
  return true;
}

// ---------------------------------------------------------------------------
// List navigation

/** Move Gmail's own cursor to the first or last email on the page. */
export function cursorToEdge(edge: 'top' | 'bottom'): boolean {
  const count = rows().length;
  if (!count) return false;
  const key = edge === 'top' ? 'k' : 'j';
  for (let i = 0; i < count; i++) press(key);
  return true;
}

/** Shift + J / K: grow (or shrink) the selection one row at a time. */
export async function extendSelection(dir: 'up' | 'down'): Promise<boolean> {
  const here = cursorRow();
  if (!here) return false;
  if (!isChecked(here)) press('x');
  await sleep(30);
  await pressAll(dir === 'down' ? 'j' : 'k', 'x');
  return true;
}

export function switchAccount(n: number): void {
  location.href = `${location.origin}/mail/u/${n - 1}/#inbox`;
}

// ---------------------------------------------------------------------------
// Smart Escape

function visibleToastClose(): HTMLElement | null {
  for (const region of Array.from(document.querySelectorAll('[role="alert"]'))) {
    const close = findControl(['Close', 'Dismiss'], region);
    if (close) return close;
  }
  return null;
}

/**
 * Escape, in order: dismiss Gmail's notification, leave an inline reply,
 * leave the open conversation, clear the selection, then go back to Inbox.
 */
export async function smartEscape(e: KeyboardEvent, closeToasts: boolean): Promise<boolean> {
  if (closeToasts) {
    const close = visibleToastClose();
    if (close) return clickLikeUser(close);
  }
  const focused = document.activeElement as HTMLElement | null;
  if (focused?.isContentEditable && focused.closest('[role="main"]')) {
    focused.blur();
    return true;
  }
  if (hasThread()) {
    press('u');
    return true;
  }
  if (selectedRows().length) {
    await pressAll('*', 'n');
    return true;
  }
  const hash = location.hash || '#inbox';
  if (!/^#inbox\b/.test(hash)) {
    e.preventDefault();
    location.hash = '#inbox';
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Toolbar and message actions found by their labels

export function moveToInbox(): boolean {
  const button = findControl(['Move to Inbox']);
  if (!button) {
    toast('Move to Inbox isn’t available here');
    return false;
  }
  return clickLikeUser(button);
}

export async function unsubscribe(): Promise<void> {
  const link = findControl(['Unsubscribe'], main() ?? document);
  if (!link) {
    toast('No unsubscribe option for this email');
    return;
  }
  clickLikeUser(link);
  // Gmail asks to confirm in a dialog; press its Unsubscribe button.
  const confirm = await waitFor(() => {
    const dialog = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]')).pop();
    return dialog ? findControl(['Unsubscribe'], dialog) : null;
  }, 2500);
  if (confirm) clickLikeUser(confirm);
}

export type RsvpAnswer = 'yes' | 'maybe' | 'no';

export async function rsvp(answer: RsvpAnswer, archiveAfter: boolean): Promise<void> {
  const words: Record<RsvpAnswer, string[]> = {
    yes: ['Yes', 'Going', 'Accept'],
    maybe: ['Maybe', 'Tentative'],
    no: ['No', 'Not going', 'Decline'],
  };
  const button = findControl(words[answer], main() ?? document);
  if (!button) {
    toast('No calendar invite in this email');
    return;
  }
  clickLikeUser(button);
  if (archiveAfter) {
    await sleep(500);
    press('e');
    toast(`Replied ${words[answer][0]} and archived`, 'success');
  }
}

// ---------------------------------------------------------------------------
// Compose helpers (operate on the compose window that has focus)

export function attachFile(from: Element | null): boolean {
  const scope = activeCompose(from) ?? document;
  return clickLikeUser(findControl(['Attach files'], scope));
}

export async function scheduleSend(from: Element | null): Promise<boolean> {
  const scope = activeCompose(from) ?? document;
  const more = findControl(['More send options'], scope);
  if (!more) return false;
  clickLikeUser(more);
  const item = await waitFor(() => findControl(['Schedule send']), 1500);
  return clickLikeUser(item);
}

export async function editSubject(from: Element | null): Promise<boolean> {
  const scope = activeCompose(from) ?? document;
  const field = () => Array.from(scope.querySelectorAll<HTMLInputElement>('input[name="subjectbox"]')).find((i) => i.offsetParent);
  let input = field();
  if (!input) {
    // Replies hide the subject behind the "Type of response" menu.
    const menu = findControl(['Type of response'], scope);
    if (!menu) return false;
    clickLikeUser(menu);
    clickLikeUser(await waitFor(() => findControl(['Edit subject']), 1500));
    input = (await waitFor(field, 1500)) ?? undefined;
  }
  if (!input) return false;
  input.focus();
  input.select();
  return true;
}

function selectedContent(): { html: string; text: string } | null {
  const sel = window.getSelection();
  const text = sel?.toString().trim();
  if (!sel || !text || !sel.rangeCount) return null;
  const holder = document.createElement('div');
  holder.appendChild(sel.getRangeAt(0).cloneContents());
  // Keep only text structure: drop media, scripts and every attribute but href.
  holder.querySelectorAll('img, video, audio, iframe, script, style, svg, button, input').forEach((n) => n.remove());
  holder.querySelectorAll('*').forEach((n) => {
    for (const a of Array.from(n.attributes)) if (a.name !== 'href') n.removeAttribute(a.name);
  });
  return { html: holder.innerHTML, text };
}

function insertQuote(body: HTMLElement, q: { html: string; text: string }): boolean {
  body.focus();
  const quote = `<blockquote style="margin:0 0 0 .8ex;border-left:2px solid #ccc;padding-left:1ex">${q.html || escapeHtml(q.text)}</blockquote><br>`;
  return document.execCommand('insertHTML', false, quote);
}

/** Q: quote the selected text into the reply (opening one if needed). */
export async function quickQuote(): Promise<void> {
  const q = selectedContent();
  if (!q) return;
  const existing = composeBody();
  if (existing) {
    insertQuote(existing, q);
    return;
  }
  press('a');
  const body = await waitFor(composeBody, 2500);
  if (body) insertQuote(body, q);
  else toast('Couldn’t open a reply to quote into', 'error');
}

/** Reply all with the person who made the introduction moved to Bcc. */
export async function replyToIntro(): Promise<void> {
  const introducer = main()?.querySelector('[data-message-id] [email]')?.getAttribute('email');
  press('a');
  const body = await waitFor(composeBody, 2500);
  if (!body || !introducer) return;
  const compose = activeCompose(body) ?? document;
  const chip = Array.from(compose.querySelectorAll<HTMLElement>('[data-hovercard-id]')).find(
    (c) => c.getAttribute('data-hovercard-id') === introducer,
  );
  const remove = chip?.querySelector<HTMLElement>('[aria-label^="Remove"], [role="button"]');
  if (remove) clickLikeUser(remove);
  clickLikeUser(findControl(['Add Bcc recipients', 'Bcc'], compose));
  const bcc = await waitFor(
    () => compose.querySelector<HTMLInputElement>('input[aria-label*="Bcc" i], [aria-label*="Bcc" i] input'),
    1500,
  );
  if (bcc) {
    bcc.focus();
    document.execCommand('insertText', false, `${introducer}, `);
  }
  body.focus();
  const name = chip?.textContent?.trim().split(/\s+/)[0];
  document.execCommand('insertText', false, `Thanks${name ? ` ${name}` : ''} (moved to Bcc).\n\n`);
}

/** Paste a URL over selected text in a compose window to link it. */
export function pasteAsLink(e: ClipboardEvent): void {
  const target = e.target as HTMLElement | null;
  if (!target?.closest?.('[contenteditable="true"]') || !activeCompose(target)) return;
  const sel = window.getSelection();
  const pasted = e.clipboardData?.getData('text/plain').trim();
  if (!sel || sel.isCollapsed || !pasted || /\s/.test(pasted)) return;
  let url: URL;
  try {
    url = new URL(pasted);
  } catch {
    return;
  }
  if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return;
  e.preventDefault();
  document.execCommand('createLink', false, url.href);
}

// ---------------------------------------------------------------------------
// Copying

let lastCopyAt = 0;

/** Copy the latest message; pressed again quickly, copy the whole conversation. */
export async function instantCopy(): Promise<void> {
  const messages = openMessages();
  if (!messages.length) {
    toast('Open an email to copy it', 'error');
    return;
  }
  const whole = Date.now() - lastCopyAt < 1500;
  lastCopyAt = whole ? 0 : Date.now();
  const picked = whole ? messages : messages.slice(-1);

  const header = (m: (typeof picked)[number]) =>
    [m.from && `From: ${m.from}`, m.to && `To: ${m.to}`, m.date && `Date: ${m.date}`].filter(Boolean) as string[];
  const subject = picked[0]?.subject ?? '';
  const text = [subject && `Subject: ${subject}`, ...picked.map((m) => [...header(m), '', m.text].join('\n'))]
    .filter(Boolean)
    .join('\n\n---\n\n');
  const html =
    (subject ? `<p><b>${escapeHtml(subject)}</b></p>` : '') +
    picked
      .map((m) => `<p style="color:#666">${header(m).map(escapeHtml).join('<br>')}</p><div>${m.html}</div>`)
      .join('<hr>');

  const ok = await copyRich(html, text);
  if (!ok) toast('Couldn’t copy this email', 'error');
  else toast(whole ? `Copied ${picked.length} message${picked.length === 1 ? '' : 's'}` : 'Copied. Press again for the whole conversation', 'success');
}

/** A link to this view that opens in the right Google account. */
export async function copyLink(): Promise<void> {
  const url = new URL(location.href);
  const email = accountEmail();
  if (email) {
    url.pathname = url.pathname.replace(/\/u\/\d+/, '/u');
    url.searchParams.set('authuser', email);
  }
  const ok = await copyRich(`<a href="${escapeHtml(url.href)}">${escapeHtml(url.href)}</a>`, url.href);
  toast(ok ? 'Link copied' : 'Couldn’t copy the link', ok ? 'success' : 'error');
}
