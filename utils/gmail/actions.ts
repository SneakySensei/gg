import {
  currentAccountEmail,
  firstVisible,
  hasSelection,
  isFullComposeOpen,
  isGmailModalOpen,
  isListView,
  isVisible,
  listRows,
  cursorRow,
  mouseClick,
  pressButton,
  rowCheckbox,
  sendGmail,
  sendSequence,
  setHash,
  sleep,
  toast,
  waitFor,
} from './dom';

// ---------------------------------------------------------------------------
// Smart Escape

export function closeModal(): void {
  document.body.click();
  document.body.click();
}

export function smartEscape(e: KeyboardEvent, opts: { closeToasts: boolean }): void {
  if (isGmailModalOpen()) {
    closeModal();
    return;
  }

  // Gemini side panel
  const gemini = document.getElementsByClassName('DYX8s')[0] as HTMLElement | undefined;
  if (gemini && gemini.offsetParent !== null) {
    const close =
      (document.getElementsByClassName('VYBDae-JX-ano')[0] as HTMLElement | undefined) ??
      (Array.from(document.getElementsByClassName('pYTkkf-JX-ano')).pop() as HTMLElement | undefined);
    close?.click();
    return;
  }

  if (isFullComposeOpen()) return;

  if (opts.closeToasts) {
    const toastClose = document.querySelector<HTMLElement>('.bBf');
    const toastClose2 = document.querySelector<HTMLElement>('.toast_close');
    const a = isVisible(toastClose);
    const b = isVisible(toastClose2);
    if (a || b) {
      if (a) toastClose!.click();
      if (b) toastClose2!.click();
      return;
    }
  }

  const hasMain = document.querySelector('[role="main"]') !== null;
  const list = isListView();
  if (hasMain && !list && document.querySelector('.I5.bzE')) {
    // An inline reply is open: just leave it.
    (document.activeElement as HTMLElement | null)?.blur?.();
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  document.body.click();
  const hash = window.location.hash;
  const parts = hash.split('/');
  const [p0 = '', p1 = ''] = parts;
  const up = () => setHash(hash.substring(0, hash.lastIndexOf('/')));
  const deselect = () => sendSequence(['asterisk', 'n'], 0);

  if (parts.length > 1) {
    if (parts.length === 2 && p0 === '#advanced-search') return setHash('#inbox');
    if (parts.length === 2 && /^p\d+$/.test(p1) && hasSelection()) return deselect();
    const isFolderLike = ['#search', '#category', '#label'].includes(p0);
    if (isFolderLike && parts.length > 2) {
      if (list) up();
      else sendGmail('back');
    } else if (isFolderLike) {
      if (hasSelection()) return deselect();
      setHash('#inbox');
    } else {
      up();
    }
    return;
  }

  if (hash.startsWith('#drafts?')) {
    e.preventDefault();
    return setHash('#drafts');
  }
  if (hasSelection()) return deselect();
  setHash('#inbox');
}

// ---------------------------------------------------------------------------
// List navigation

export function goToEdge(edge: 'top' | 'bottom'): boolean {
  const rows = listRows();
  if (!rows.length) return false;
  const row = (edge === 'bottom' ? [...rows].reverse() : rows).find((r) => rowCheckbox(r));
  const cb = rowCheckbox(row);
  if (!row || !cb) return false;
  // Clicking the checkbox twice moves Gmail's cursor without changing selection.
  cb.click();
  cb.click();
  const scroll = () => row.scrollIntoView({ block: edge === 'bottom' ? 'end' : 'start' });
  scroll();
  requestAnimationFrame(scroll);
  setTimeout(() => row.classList.contains('btb') && scroll(), 120);
  return true;
}

export function extendSelection(e: KeyboardEvent, dir: 'up' | 'down'): void {
  if (!isListView()) return;
  const row = cursorRow();
  if (!row) return;
  const next = (dir === 'down' ? row.nextElementSibling : row.previousElementSibling) as HTMLElement | null;
  const cb = row.querySelector<HTMLElement>('div[role="checkbox"]');
  const checked = cb?.getAttribute('aria-checked') === 'true' || row.classList.contains('x7');
  e.preventDefault();
  e.stopPropagation();
  if (!checked) mouseClick(cb);
  if (!next) return;
  const nextCb = next.querySelector<HTMLElement>('div[role="checkbox"]');
  // Two clicks: net-zero selection change, but moves the cursor onto the row.
  mouseClick(nextCb);
  mouseClick(nextCb);
}

// ---------------------------------------------------------------------------
// Move to inbox / unsubscribe

export function moveToInbox(): boolean {
  const btn =
    document.querySelector('[role="button"][aria-label="Move to Inbox"]') ??
    firstVisible('[role="button"][data-tooltip="Move to Inbox"]');
  if (!btn) {
    toast('Move to Inbox is not available here');
    return false;
  }
  pressButton(btn);
  setTimeout(() => sendSequence(['asterisk', 'n'], 0), 200);
  return true;
}

function dialogOkButton(): HTMLElement | null {
  const dialogs = document.querySelectorAll('[role="alertdialog"], [role="dialog"]');
  for (let i = dialogs.length - 1; i >= 0; i--) {
    const ok = dialogs[i]?.querySelector<HTMLElement>('button[data-mdc-dialog-action="ok"]');
    if (ok) return ok;
  }
  return (document.getElementsByClassName('mUIrbf-I mUIrbf-I-ql-Uw eV8l8d')[0] as HTMLElement) ?? null;
}

export async function unsubscribe(): Promise<void> {
  const link = document.getElementsByClassName('Ca')[0] as HTMLElement | undefined;
  if (!link) {
    toast('No unsubscribe link found for this email');
    return;
  }
  link.click();
  const ok = await waitFor(dialogOkButton, 3600, 120);
  if (!ok) return;
  for (let i = 0; i < 20 && dialogOkButton(); i++) {
    dialogOkButton()?.click();
    await sleep(150);
  }
}

// ---------------------------------------------------------------------------
// RSVP

export type Rsvp = 'RSVP_YES' | 'RSVP_MAYBE' | 'RSVP_NO';

function clickRsvpClassic(kind: Rsvp) {
  if (kind === 'RSVP_YES') {
    const yes = document.getElementsByClassName('aHW')[0];
    if (yes) return (yes.children[0] as HTMLElement | undefined)?.click();
  }
  const idx = kind === 'RSVP_YES' ? 0 : kind === 'RSVP_MAYBE' ? 1 : 2;
  ((document.getElementsByClassName('aRm')[0]?.firstElementChild?.children[idx]) as HTMLElement | undefined)?.click();
}

function clickRsvpCard(kind: Rsvp) {
  const card = document.getElementsByClassName('oEssId')[0];
  if (!card) return;
  const idx = kind === 'RSVP_YES' ? 0 : kind === 'RSVP_NO' ? 1 : 2;
  const buttons = card.querySelectorAll<HTMLElement>(
    'div[role="button"], button, div[jsaction*="click"], div[data-action-data], div[jslog]',
  );
  const btn = buttons[idx];
  if (btn) return btn.click();
  const words: Record<Rsvp, string[]> = {
    RSVP_YES: ['yes', 'going', 'accept'],
    RSVP_MAYBE: ['maybe', 'tentative'],
    RSVP_NO: ['no', 'not going', 'decline'],
  };
  const match = Array.from(card.querySelectorAll<HTMLElement>('*[role="button"], button, *[jsaction*="click"]')).find((b) => {
    const t = b.textContent?.trim().toLowerCase() ?? '';
    return words[kind].some((w) => t.includes(w));
  });
  match?.click();
}

function tryRsvp(kind: Rsvp): boolean {
  if (document.getElementsByClassName('aRm').length) {
    clickRsvpClassic(kind);
    return true;
  }
  if (document.getElementsByClassName('oEssId').length) {
    clickRsvpCard(kind);
    return true;
  }
  return false;
}

export async function rsvp(kind: Rsvp, archiveAfter: boolean): Promise<void> {
  const expand = document.querySelector<HTMLElement>('button.bzq.bzr.iVIPM');
  let ok: boolean;
  if (expand) {
    expand.click();
    await sleep(200);
    ok = !!(await waitFor(() => tryRsvp(kind), 2500, 100));
  } else {
    ok = tryRsvp(kind);
  }
  if (!ok) {
    toast('No calendar invite found in this email');
    return;
  }
  if (archiveAfter) {
    await sleep(400);
    sendGmail('archive');
    const word = kind === 'RSVP_YES' ? 'Yes' : kind === 'RSVP_MAYBE' ? 'Maybe' : 'No';
    toast(`Responded ${word}. Invitation archived.`, 'success');
  }
}

// ---------------------------------------------------------------------------
// Compose helpers

function composeRoots(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.M9, .aXw'));
}

function findInCompose(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    const el = document.querySelector<HTMLElement>(s);
    if (el) return el;
  }
  for (const root of composeRoots()) {
    for (const s of selectors) {
      const el = root.querySelector<HTMLElement>(s);
      if (el) return el;
    }
  }
  return null;
}

export function attachFile(): boolean {
  return mouseClick(findInCompose(['div[command="Files"]', '.wG.J-Z-I[role="button"][tabindex="1"]']));
}

export function scheduleSend(): boolean {
  const arrow = firstVisible('.G-asx');
  if (!arrow) return false;
  pressButton(arrow);
  const item = firstVisible('.J-N.yr') ?? (document.getElementsByClassName('J-N yr')[0] as HTMLElement | undefined);
  item?.focus();
  pressButton(item);
  pressButton(item);
  return true;
}

function dispatchPointer(el: Element, types: string[]) {
  const r = el.getBoundingClientRect();
  const init = { view: window, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  types.forEach((t) => el.dispatchEvent(new MouseEvent(t, init)));
}

function focusInput(el: HTMLInputElement) {
  el.focus();
  if (el.value) el.select();
  return true;
}

export function editSubject(): boolean {
  const subjects = Array.from(document.querySelectorAll<HTMLInputElement>('.aoT'));
  const visible = subjects.find(isVisible);
  if (visible) return focusInput(visible);

  // Replies hide the subject behind the "type of response" menu.
  const any = subjects[0];
  const root = (any?.closest('.M9') || any?.closest('.iN')) as HTMLElement | null;
  const menuBtn = root?.querySelector('.HQ [role="button"]');
  if (!root || !menuBtn) return false;

  const findItem = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.J-M [role="menuitem"]')).find((el) => {
      const t = (el.textContent ?? '').trim().toLowerCase();
      return t.includes('edit subject') && el.getBoundingClientRect().height !== 0;
    }) ?? null;

  const attempt = (left: number) => {
    const s = root.querySelector<HTMLInputElement>('.aoT');
    if (isVisible(s)) return focusInput(s!);
    if (left <= 0) return;
    if (!findItem()) dispatchPointer(menuBtn, ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);
    setTimeout(() => {
      const item = findItem();
      if (item) dispatchPointer(item, ['mouseover', 'mousemove', 'mousedown', 'mouseup', 'click']);
      setTimeout(() => {
        const s2 = root.querySelector<HTMLInputElement>('.aoT');
        if (isVisible(s2)) focusInput(s2!);
        else attempt(left - 1);
      }, 250);
    }, 250);
  };
  attempt(5);
  return true;
}

function isComposeOpen(): boolean {
  return composeRoots().some(
    (r) =>
      isVisible(r) &&
      r.offsetHeight > 0 &&
      !!(r.querySelector('[contenteditable="true"]') || r.querySelector('tr.btC, .btC') || r.querySelector('.gU.Up, .aoO')),
  );
}

function composeBody(): HTMLElement | null {
  for (const root of composeRoots().filter((r) => isVisible(r) && r.offsetHeight > 0)) {
    const labelled = Array.from(root.querySelectorAll<HTMLElement>('[contenteditable="true"][aria-label]')).find((el) => {
      const l = (el.getAttribute('aria-label') ?? '').toLowerCase();
      return isVisible(el) && (l.includes('message') || l.includes('body'));
    });
    if (labelled) return labelled;
    let best: HTMLElement | null = null;
    root.querySelectorAll<HTMLElement>('[contenteditable="true"]').forEach((el) => {
      if (isVisible(el) && el.getAttribute('role') !== 'textbox' && el.offsetHeight > (best?.offsetHeight ?? 0)) best = el;
    });
    if (best) return best;
  }
  return null;
}

const STRIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'IMG', 'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA']);
const KEEP = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);
const BLOCKIFY = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'TABLE', 'TR']);

function selectionContent(): { text: string; html: string | null } | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const text = sel.toString().trim();
  if (!text) return null;
  const div = document.createElement('div');
  for (let i = 0; i < sel.rangeCount; i++) div.appendChild(sel.getRangeAt(i).cloneContents());
  const all = Array.from(div.querySelectorAll('*'));
  for (let i = all.length - 1; i >= 0; i--) {
    const el = all[i]!;
    const tag = el.tagName;
    if (STRIP.has(tag)) el.remove();
    else if (KEEP.has(tag)) {
      const href = tag === 'A' ? el.getAttribute('href') : null;
      while (el.attributes.length) el.removeAttribute(el.attributes[0]!.name);
      if (href && /^(https?:|mailto:)/i.test(href)) el.setAttribute('href', href);
    } else if (BLOCKIFY.has(tag)) {
      const d = document.createElement('div');
      while (el.firstChild) d.appendChild(el.firstChild);
      el.replaceWith(d);
    } else el.replaceWith(...Array.from(el.childNodes));
  }
  return { text, html: div.innerHTML.trim() || null };
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function insertQuote(q: { text: string; html: string | null }): boolean {
  const body = composeBody();
  if (!body) return false;
  body.focus();
  const sel = window.getSelection()!;
  let range = sel.rangeCount ? sel.getRangeAt(0) : null;
  if (!range || !body.contains(range.startContainer)) {
    range = document.createRange();
    const quoted = body.querySelector('div.gmail_quote_container, div.gmail_quote');
    if (quoted) range.setStartBefore(quoted);
    else {
      range.selectNodeContents(body);
      range.collapse(false);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  const before = document.createRange();
  before.setStart(body, 0);
  before.setEnd(range.startContainer, range.startOffset);
  const lead = before.toString().trim().length > 0 ? '<div><br></div>' : '';
  const inner = q.html || escapeHtml(q.text).split('\n').join('<br>');
  const html = `${lead}<blockquote class="gmail_quote" style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">${inner}</blockquote><div><br></div><div><br></div>`;
  return document.execCommand('insertHTML', false, html);
}

export function quickQuote(): void {
  const q = selectionContent();
  if (!q) return;
  if (isComposeOpen()) {
    insertQuote(q);
    return;
  }
  const list = isListView();
  if (list) sendGmail('open');
  setTimeout(
    async () => {
      sendGmail('replyAll');
      const ok = await waitFor(() => isComposeOpen() && composeBody() && insertQuote(q), 2400, 100);
      if (!ok) toast('Could not open a reply to quote into', 'error');
    },
    list ? 200 : 0,
  );
}

/** Paste text into a Gmail recipient input (Gmail turns it into chips). */
function pasteInto(text: string, target: HTMLElement) {
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}

export async function replyToIntro(): Promise<void> {
  let compose: HTMLElement | null = null;
  for (let i = 0; i <= 20 && !compose; i++) {
    compose = document.querySelector<HTMLElement>('.iY .I5');
    if (!compose) {
      if (i === 0) sendGmail('replyAll');
      await sleep(50);
    }
  }
  if (!compose) return;

  const people = await waitFor(() => {
    const p = compose!.querySelectorAll<HTMLElement>('td.eV .agh div[data-hovercard-id]');
    return p.length ? p : null;
  }, 1000);
  if (!people || people.length === 1) return;

  const introducer = people[0]!;
  const email = introducer.dataset.hovercardId!;
  const name = introducer.dataset.name ?? email;
  const firstName = name.split(' ')[0];
  const others = Array.from(people)
    .slice(1)
    .map((p) => `${p.dataset.name} <${p.dataset.hovercardId}>, `)
    .join('');

  const bccToggle = compose.querySelector('.aB.gQ.pB');
  if (!bccToggle) return;
  mouseClick(bccToggle);
  const inputs = compose.querySelectorAll<HTMLInputElement>('.bzf input');
  if (!inputs.length) return;
  const toInput = inputs[0]!;
  const bccInput = inputs[inputs.length - 1]!;
  bccInput.focus();
  compose.querySelectorAll('.afX').forEach((x) => mouseClick(x)); // remove existing chips
  bccInput.value = '';
  pasteInto(`${name} <${email}>`, bccInput);
  toInput.value = '';
  pasteInto(others, toInput);

  const body = compose.querySelector<HTMLElement>('.Am');
  if (!body) return;
  const first = body.firstChild;
  const br1 = document.createElement('br');
  const br2 = document.createElement('br');
  const text = document.createTextNode(`Thanks ${firstName} (moved to BCC)`);
  body.insertBefore(br2, first);
  body.insertBefore(br1, br2);
  body.insertBefore(text, br1);
  body.focus();
  mouseClick(body);
  if (first) {
    const r = document.createRange();
    r.setStart(first, 0);
    r.collapse(true);
    const s = window.getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
  }
}

export function handlePasteAsLink(e: ClipboardEvent): void {
  const editable = (e.target as HTMLElement | null)?.closest?.('[contenteditable="true"]');
  if (!editable || !editable.closest('.M9, .aXw')) return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const text = e.clipboardData?.getData('text')?.trim();
  if (!text) return;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return;
  }
  if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return;
  e.preventDefault();
  e.stopPropagation();
  const frag = sel.getRangeAt(0).cloneContents();
  frag.querySelectorAll('a').forEach((a) => a.replaceWith(...Array.from(a.childNodes)));
  const a = document.createElement('a');
  a.href = text;
  a.appendChild(frag);
  sel.deleteFromDocument();
  sel.getRangeAt(0).insertNode(a);
  sel.collapseToEnd();
}

// ---------------------------------------------------------------------------
// Clipboard: instant copy and copy link

async function writeClipboard(html: string, text: string): Promise<boolean> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
    return true;
  } catch {
    try {
      const div = document.createElement('div');
      div.innerHTML = html;
      Object.assign(div.style, { position: 'fixed', left: '-9999px', opacity: '0' });
      document.body.appendChild(div);
      const r = document.createRange();
      r.selectNodeContents(div);
      const s = window.getSelection()!;
      s.removeAllRanges();
      s.addRange(r);
      const ok = document.execCommand('copy');
      s.removeAllRanges();
      div.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

interface Message {
  fromName: string;
  fromEmail: string;
  to: string;
  date: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

function readMessage(container: Element): Message | null {
  const body = container.querySelector<HTMLElement>('.a3s');
  if (!body || body.offsetParent === null) return null;
  const from = container.querySelector('.gD');
  const recipients = Array.from(container.querySelectorAll('.hb [email]'))
    .map((el) => {
      const n = el.getAttribute('name') || el.textContent?.trim() || '';
      const em = el.getAttribute('email') || '';
      return n && n !== em ? `${n} <${em}>` : em;
    })
    .filter(Boolean)
    .join(', ');
  const date = container.querySelector('.g3')?.getAttribute('title') || container.querySelector('.g3')?.textContent || '';
  return {
    fromName: from?.getAttribute('name') || from?.textContent?.trim() || '',
    fromEmail: from?.getAttribute('email') || '',
    to: recipients,
    date,
    subject: document.querySelector('h2.hP')?.textContent?.trim() || '',
    bodyHtml: body.innerHTML,
    bodyText: body.innerText.trim(),
  };
}

function formatMessage(m: Message, includeSubject: boolean) {
  const from = m.fromName && m.fromEmail ? `${m.fromName} <${m.fromEmail}>` : m.fromName || m.fromEmail;
  const lines: string[] = [];
  if (from) lines.push(`From: ${from}`);
  if (m.to) lines.push(`To: ${m.to}`);
  if (m.date) lines.push(`Date: ${m.date}`);
  if (includeSubject && m.subject) lines.push(`Subject: ${m.subject}`);
  const text = [...lines, '', m.bodyText].join('\n');
  const header = lines.map((l) => `<div><b>${escapeHtml(l.split(':')[0] ?? '')}:</b>${escapeHtml(l.slice(l.indexOf(':') + 1))}</div>`).join('');
  const html = `<div style="font-size:13px;color:#555;margin-bottom:12px">${header}</div><div>${m.bodyHtml}</div>`;
  return { text, html };
}

let lastCopy = 0;

export async function instantCopy(): Promise<void> {
  const containers = Array.from(document.querySelectorAll("div[role='main'] .adn"));
  const messages = containers.map(readMessage).filter((m): m is Message => !!m);
  if (!messages.length) {
    toast('Open an email to copy it', 'error');
    return;
  }
  const conversation = Date.now() - lastCopy < 1500;
  lastCopy = conversation ? 0 : Date.now();

  let html: string;
  let text: string;
  if (!conversation) {
    ({ html, text } = formatMessage(messages[messages.length - 1]!, true));
  } else {
    const subject = messages[0]!.subject;
    const parts = messages.map((m) => formatMessage(m, false));
    html = `<p><b>Subject:</b> ${escapeHtml(subject)}</p>${parts.map((p) => p.html).join('<hr>')}`;
    text = `Subject: ${subject}\n\n${parts.map((p) => p.text).join('\n\n---\n\n')}`;
  }
  const ok = await writeClipboard(html, text);
  if (!ok) toast('Could not copy email', 'error');
  else if (conversation) toast(`Copied ${messages.length} expanded message(s) in this conversation`, 'success');
  else toast('Message copied. Press again to copy the conversation.', 'success');
}

export async function copyPageLink(): Promise<void> {
  let link = window.location.href;
  const email = currentAccountEmail();
  if (email) {
    const url = new URL(link);
    url.pathname = url.pathname.replace(/\/u\/\d+(?=\/|$)/, '/u');
    url.searchParams.set('authuser', email);
    link = url.toString();
  }
  const ok = await writeClipboard(`<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`, link);
  toast(ok ? 'Link copied' : 'Could not copy link', ok ? 'success' : 'error');
}

/** True when Enter should expand a collapsed last message instead of replying. */
export function hasCollapsedMessage(): boolean {
  const main = document.querySelector("div[role='main']");
  if (!main) return false;
  for (const el of Array.from(main.querySelectorAll('.aFg'))) {
    if (getComputedStyle(el).display === 'none') continue;
    const msg = el.closest('.kv') || el.closest('.gs') || el.closest('.h7');
    if (!msg) continue;
    const body = msg.querySelector<HTMLElement>('.a3s.aiL');
    if (!body || body.offsetParent === null) return true;
  }
  return false;
}
