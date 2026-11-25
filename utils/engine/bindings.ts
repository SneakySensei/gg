/**
 * GG's shortcut table: every shortcut as one entry saying which keys trigger
 * it, when it applies and what it does. The engine walks this table.
 *
 * Keys are chord strings from keys.ts: "e", "shift+3" (#), "mod+shift+l",
 * "alt+/". A two-step sequence is written "g g" or "g digit".
 * `run` returns false (or a promise of false) to let Gmail handle the key.
 */
import type { ShortcutId } from '@/utils/shortcuts';
import { press, pressAll } from './keys';
import * as F from './features';
import { dialogOpen, hasList, hasTextSelection, hasThread, inInboxLikeView, isSplitPane, openMessages, rows, selectedRows } from './page';
import { hoveredRow } from './pointer';

export interface Ctx {
  event: KeyboardEvent;
  /** Focus is in a text field or compose window. */
  typing: boolean;
  /** The row under the mouse, when nothing is selected. */
  hover: HTMLTableRowElement | null;
  /** The digit pressed, for "g digit". */
  digit?: number;
  on(id: ShortcutId): boolean;
}

export interface Binding {
  id: ShortcutId;
  keys: string[];
  /** Applies while typing (compose shortcuts); otherwise ignored when typing. */
  whileTyping?: boolean;
  when?: (c: Ctx) => boolean;
  run: (c: Ctx) => boolean | void | Promise<boolean | void>;
}

/** The hovered row, but only when nothing is selected (selection wins). */
export function hoverTarget(): HTMLTableRowElement | null {
  const row = hoveredRow();
  return row && selectedRows().length === 0 ? row : null;
}

/** Focus is in a reply editor inside the conversation (not a compose window). */
function isInlineReply(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el?.isContentEditable && !!el.closest('[role="main"]') && !el.closest('[role="dialog"]');
}

const threadOnly = () => hasThread() && !isSplitPane();
const listOnly = () => hasList() && !hasThread();

export const BINDINGS: Binding[] = [
  // ---- Navigation
  { id: 'GO_TO_TOP', keys: ['g g'], when: () => rows().length > 0, run: () => F.cursorToEdge('top') },
  { id: 'GO_TO_BOTTOM', keys: ['shift+g'], when: () => rows().length > 0, run: () => F.cursorToEdge('bottom') },
  { id: 'GO_ACCOUNT', keys: ['g digit'], run: (c) => (c.digit ? (F.switchAccount(c.digit), true) : false) },
  {
    id: 'GO_SPAM_TRASH',
    keys: ['g shift+1', 'g shift+3'],
    run: (c) => {
      location.hash = c.event.code === 'Digit1' ? '#spam' : '#trash';
    },
  },
  { id: 'ARROW_LEFT', keys: ['left'], when: () => !hasTextSelection(), run: () => (hasThread() ? press('k') : pressAll('g', 'p')) },
  { id: 'ARROW_RIGHT', keys: ['right'], when: () => !hasTextSelection(), run: () => (hasThread() ? press('j') : pressAll('g', 'n')) },
  { id: 'ARROW_UP', keys: ['up'], when: () => threadOnly() && openMessages().length > 1, run: () => press('p') },
  { id: 'ARROW_DOWN', keys: ['down'], when: () => threadOnly() && openMessages().length > 1, run: () => press('n') },
  {
    id: 'ESCAPE_SMART',
    keys: ['esc'],
    whileTyping: true,
    // While typing, Escape only leaves an inline reply; compose windows and Gmail's dialogs keep their own Escape.
    when: (c) => !dialogOpen() && (!c.typing || isInlineReply(c.event.target)),
    run: (c) => F.smartEscape(c.event, c.on('ESCAPE_CLOSE_TOASTS')),
  },

  // ---- Acting on emails (hover first, then Gmail's own behaviour)
  {
    id: 'ARCHIVE',
    keys: ['e'],
    run: (c) => {
      if (c.on('ARCHIVE_MARKS_READ')) {
        void F.archiveMarkingRead(c.hover);
        return true;
      }
      return c.hover ? F.rowAction(c.hover, 'Archive', 'e') : false;
    },
  },
  { id: 'DELETE_HASH', keys: ['shift+3'], when: (c) => !!c.hover, run: (c) => F.rowAction(c.hover!, 'Delete', '#') },
  { id: 'DELETE_KEY', keys: ['del'], run: (c) => (c.hover ? F.rowAction(c.hover, 'Delete', '#') : press('#')) },
  { id: 'DELETE_BACKSPACE', keys: ['backspace'], run: (c) => (c.hover ? F.rowAction(c.hover, 'Delete', '#') : press('#')) },
  {
    id: 'TOGGLE_UNREAD',
    keys: ['u'],
    run: (c) => {
      if (c.hover) return F.rowToggleRead(c.hover);
      if (hasThread() && !hasList()) return press('shift+u');
      return F.toggleReadSelection();
    },
  },
  { id: 'MARK_READ', keys: ['shift+i'], when: (c) => !!c.hover, run: (c) => F.rowAction(c.hover!, 'Mark as read', 'shift+i') },
  { id: 'STAR', keys: ['s'], when: (c) => !!c.hover, run: (c) => F.rowStarToggle(c.hover!) },
  {
    id: 'STAR_AND_ARCHIVE',
    keys: ['shift+s'],
    run: async (c) => {
      if (c.hover) {
        F.rowStarToggle(c.hover);
        await new Promise((r) => setTimeout(r, 120));
        if (c.hover.isConnected) F.rowAction(c.hover, 'Archive', 'e');
        return true;
      }
      await pressAll('s', 'e');
      return true;
    },
  },
  { id: 'SNOOZE_B', keys: ['b'], when: (c) => !!c.hover, run: (c) => F.rowAction(c.hover!, 'Snooze', 'b') },
  { id: 'SNOOZE_H', keys: ['h'], run: (c) => (c.hover ? F.rowAction(c.hover, 'Snooze', 'b') : press('b')) },
  { id: 'REPLY', keys: ['r'], when: (c) => !!c.hover, run: (c) => F.rowOpenThen(c.hover!, 'r') },
  { id: 'REPLY_ALL', keys: ['a'], when: (c) => !!c.hover, run: (c) => F.rowOpenThen(c.hover!, 'a') },
  { id: 'FORWARD', keys: ['f'], when: (c) => !!c.hover, run: (c) => F.rowOpenThen(c.hover!, 'f') },
  { id: 'LABEL', keys: ['l'], when: (c) => !!c.hover, run: (c) => F.rowWithKey(c.hover!, 'l') },
  { id: 'SPAM', keys: ['shift+1'], when: (c) => !!c.hover, run: (c) => F.rowWithKey(c.hover!, '!') },
  { id: 'SELECT', keys: ['x'], when: (c) => !!c.hover, run: (c) => (c.hover!.querySelector<HTMLElement>('[role="checkbox"]')?.click(), true) },
  {
    id: 'MOVE_INBOX',
    keys: ['v'],
    run: (c) => {
      if (inInboxLikeView()) return c.hover ? F.rowWithKey(c.hover, 'v') : false;
      if (c.hover) c.hover.querySelector<HTMLElement>('[role="checkbox"]')?.click();
      return F.moveToInbox();
    },
  },
  { id: 'ENTER_REPLY', keys: ['enter'], when: () => threadOnly() && !hasTextSelection(), run: () => press('a') },
  { id: 'MULTI_SELECT', keys: ['shift+down', 'shift+j'], when: listOnly, run: () => F.extendSelection('down') },
  { id: 'MULTI_SELECT', keys: ['shift+up', 'shift+k'], when: listOnly, run: () => F.extendSelection('up') },
  { id: 'SELECT_ALL', keys: ['mod+a'], when: listOnly, run: () => pressAll('*', 'a') },
  { id: 'UNDO', keys: ['mod+z'], run: () => press('z') },
  { id: 'UNSUBSCRIBE', keys: ['mod+u'], when: () => hasThread(), run: () => F.unsubscribe() },
  { id: 'INSTANT_COPY', keys: ['mod+c'], when: () => hasThread() && !hasTextSelection(), run: () => F.instantCopy() },
  { id: 'COPY_PAGE_LINK', keys: ['alt+/'], run: () => F.copyLink() },
  { id: 'REPLY_TO_INTRO', keys: ['mod+shift+i'], when: () => hasThread(), run: () => F.replyToIntro() },
  { id: 'QUICK_QUOTE', keys: ['q'], when: () => hasThread() && hasTextSelection(), run: () => F.quickQuote() },

  // ---- RSVP
  { id: 'RSVP_YES', keys: ['shift+y'], when: () => hasThread(), run: (c) => F.rsvp('yes', c.on('ARCHIVE_AFTER_RSVP')) },
  { id: 'RSVP_MAYBE', keys: ['shift+m'], when: () => hasThread(), run: (c) => F.rsvp('maybe', c.on('ARCHIVE_AFTER_RSVP')) },
  { id: 'RSVP_NO', keys: ['shift+n'], when: () => hasThread(), run: (c) => F.rsvp('no', c.on('ARCHIVE_AFTER_RSVP')) },

  // ---- Compose (work while typing)
  { id: 'SCHEDULE_SEND', keys: ['mod+shift+l'], whileTyping: true, run: (c) => F.scheduleSend(c.event.target as Element) },
  { id: 'EDIT_SUBJECT', keys: ['mod+shift+s'], whileTyping: true, run: (c) => F.editSubject(c.event.target as Element) },
  { id: 'ATTACH_FILE', keys: ['mod+shift+a'], whileTyping: true, run: (c) => F.attachFile(c.event.target as Element) },
];
