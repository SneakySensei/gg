/**
 * Shortcut registry shared by the options page and the Gmail content scripts.
 * Modelled after CMDK's shortcut settings (ids, groups, keys, defaults).
 */

export const SETTINGS_KEY = 'gmailPlusShortcutSettings';
export const MASTER_KEY = 'gmailPlusShortcutsEnabled';
/** Global kill switch: false turns off every GG feature (shortcuts, nudges, appearance). */
export const GLOBAL_KEY = 'ggEnabled';
/** storage.local: accounts GG has already turned Gmail's keyboard shortcuts on for. */
export const ONBOARDED_KEY = 'ggOnboardedAccounts';

export const SHORTCUT_IDS = [
  // General settings
  'SHORTCUT_NUDGES',
  'SELECT_ON_HOVER',
  // Navigation
  'ESCAPE_SMART',
  'ESCAPE_CLOSE_TOASTS',
  'ARROW_RIGHT',
  'ARROW_LEFT',
  'ARROW_DOWN',
  'ARROW_UP',
  'GO_TO_TOP',
  'GO_TO_BOTTOM',
  'GO_ACCOUNT',
  'GO_SPAM_TRASH',
  // Email actions
  'DELETE_BACKSPACE',
  'DELETE_KEY',
  'SNOOZE_B',
  'SNOOZE_H',
  'TOGGLE_UNREAD',
  'STAR_AND_ARCHIVE',
  'ARCHIVE_MARKS_READ',
  'ENTER_REPLY',
  'REPLY_TO_INTRO',
  'MOVE_INBOX',
  'MULTI_SELECT',
  'SELECT_ALL',
  'UNDO',
  'UNSUBSCRIBE',
  'INSTANT_COPY',
  'COPY_PAGE_LINK',
  // Compose
  'SCHEDULE_SEND',
  'EDIT_SUBJECT',
  'ATTACH_FILE',
  'QUICK_QUOTE',
  'PASTE_AS_LINK',
  // RSVP
  'RSVP_YES',
  'RSVP_MAYBE',
  'RSVP_NO',
  'ARCHIVE_AFTER_RSVP',
  // Hover actions
  'ARCHIVE',
  'REPLY',
  'REPLY_ALL',
  'FORWARD',
  'DELETE_HASH',
  'STAR',
  'MARK_READ',
  'LABEL',
  'SPAM',
  'SELECT',
] as const;

export type ShortcutId = (typeof SHORTCUT_IDS)[number];
export type ShortcutSettings = Partial<Record<ShortcutId, boolean>>;

/** Shortcuts that change behaviour more aggressively start disabled (same as CMDK). */
const OFF_BY_DEFAULT: ShortcutId[] = ['STAR_AND_ARCHIVE', 'ARCHIVE_MARKS_READ', 'ARCHIVE_AFTER_RSVP', 'SELECT_ON_HOVER'];

export const DEFAULT_SETTINGS: Record<ShortcutId, boolean> = Object.fromEntries(
  SHORTCUT_IDS.map((id) => [id, !OFF_BY_DEFAULT.includes(id)]),
) as Record<ShortcutId, boolean>;

export function isEnabled(settings: ShortcutSettings, id: ShortcutId): boolean {
  return id in settings ? settings[id] !== false : DEFAULT_SETTINGS[id];
}

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';
const ALT = isMac ? 'Option' : 'Alt';

export interface ShortcutDef {
  id: ShortcutId;
  label: string;
  keys: string;
  description: string;
}

export interface ShortcutGroup {
  id: string;
  label: string;
  description?: string;
  shortcuts: ShortcutDef[];
}

export interface GeneralSetting {
  id: ShortcutId;
  label: string;
  description: string;
}

/** Behaviour toggles shown on the General tab (not tied to a single key). */
export const GENERAL_SETTINGS: GeneralSetting[] = [
  {
    id: 'SHORTCUT_NUDGES',
    label: 'Show keyboard shortcut nudges',
    description: 'Show the keyboard shortcut to use when you hover over a button in Gmail.',
  },
  {
    id: 'SELECT_ON_HOVER',
    label: 'Select emails on hover',
    description: 'Shortcuts act on the email under your mouse pointer when no email is selected.',
  },
  {
    id: 'ARCHIVE_AFTER_RSVP',
    label: 'Archive after RSVP',
    description: 'After you RSVP to calendar invites with Shift + Y, Shift + M, or Shift + N, archive the email.',
  },
];

/** Keyboard shortcuts shown on the Keyboard Shortcuts tab. */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: 'navigation',
    label: 'Navigation',
    shortcuts: [
      { id: 'ESCAPE_SMART', label: 'Smart Escape', keys: 'Esc', description: 'Close emails, popups, or go back to Inbox.' },
      { id: 'ESCAPE_CLOSE_TOASTS', label: 'Close Gmail notifications', keys: 'Esc', description: "Close Gmail's toast and success notifications using Esc." },
      { id: 'ARROW_RIGHT', label: 'Next email or page', keys: '→', description: 'Move to the next (older) email, or the next page in the email list.' },
      { id: 'ARROW_LEFT', label: 'Previous email or page', keys: '←', description: 'Move to the previous (newer) email, or the previous page in the email list.' },
      { id: 'ARROW_DOWN', label: 'Next message in thread', keys: '↓', description: 'Jump to the next message within a conversation thread. Not available in split pane mode.' },
      { id: 'ARROW_UP', label: 'Previous message in thread', keys: '↑', description: 'Jump to the previous message within a conversation thread. Not available in split pane mode.' },
      { id: 'GO_TO_TOP', label: 'Jump to top of list', keys: 'g g', description: 'Press g then g to jump to the first email on the page.' },
      { id: 'GO_TO_BOTTOM', label: 'Jump to bottom of list', keys: '⇧ G', description: 'Press Shift + G to jump to the last email on the page.' },
      { id: 'GO_ACCOUNT', label: 'Switch Gmail account', keys: 'g 1…9', description: 'Press g then a number to switch to that signed-in Gmail account.' },
      { id: 'GO_SPAM_TRASH', label: 'Go to Spam / Trash', keys: 'g ! / g #', description: 'Press g then Shift + 1 for Spam, g then Shift + 3 for Trash.' },
    ],
  },
  {
    id: 'emailActions',
    label: 'Email Actions',
    description: 'Shortcuts that change the default Gmail behaviour.',
    shortcuts: [
      { id: 'DELETE_BACKSPACE', label: 'Delete', keys: 'Backspace', description: 'Delete emails using the Backspace key.' },
      { id: 'DELETE_KEY', label: 'Delete', keys: 'Del', description: 'Delete emails using the Del key.' },
      { id: 'SNOOZE_B', label: 'Snooze', keys: 'B', description: 'Open the snooze menu for the selected or hovered email.' },
      { id: 'SNOOZE_H', label: 'Snooze (Superhuman style)', keys: 'H', description: 'Additional key to snooze emails, Superhuman style.' },
      { id: 'TOGGLE_UNREAD', label: 'Toggle Read/Unread', keys: 'U', description: 'Toggle the read or unread status of the selected email.' },
      { id: 'STAR_AND_ARCHIVE', label: 'Star and Archive', keys: 'Shift + S', description: 'Star and archive the selected or hovered email in one action.' },
      { id: 'ARCHIVE_MARKS_READ', label: 'Archive marks as read', keys: 'E', description: 'When you archive with E, unread emails are marked as read first.' },
      { id: 'ENTER_REPLY', label: 'Reply to email when viewing', keys: 'Enter', description: 'Reply all to the email you are viewing.' },
      { id: 'REPLY_TO_INTRO', label: 'Reply to intro', keys: `${MOD} + Shift + I`, description: 'Reply to an intro email with the introducer moved to BCC.' },
      { id: 'MOVE_INBOX', label: 'Move to Inbox', keys: 'V', description: 'Move selected email to Inbox when in All Mail, Sent, etc.' },
      { id: 'MULTI_SELECT', label: 'Multi-select emails', keys: 'Shift + ↑↓', description: 'Extend email selection up or down with Shift.' },
      { id: 'SELECT_ALL', label: 'Select all', keys: `${MOD} + A`, description: 'Select all emails in the current view.' },
      { id: 'UNDO', label: 'Undo', keys: `${MOD} + Z`, description: 'Undo the last action (e.g. archive, delete).' },
      { id: 'UNSUBSCRIBE', label: 'Unsubscribe', keys: `${MOD} + U`, description: 'Unsubscribe from the open newsletter or mailing list.' },
      { id: 'INSTANT_COPY', label: 'Instant copy', keys: `${MOD} + C`, description: 'Copy the current message to the clipboard. Press again for the entire conversation.' },
      { id: 'COPY_PAGE_LINK', label: 'Copy link to email', keys: `${ALT} + /`, description: 'Copy a link to the current email that opens in the right Google account.' },
    ],
  },
  {
    id: 'compose',
    label: 'Compose',
    shortcuts: [
      { id: 'SCHEDULE_SEND', label: 'Schedule send', keys: `${MOD} + Shift + L`, description: 'Schedule when to send your email.' },
      { id: 'EDIT_SUBJECT', label: 'Edit subject', keys: `${MOD} + Shift + S`, description: 'Edit the subject field.' },
      { id: 'ATTACH_FILE', label: 'Attach file', keys: `${MOD} + Shift + A`, description: 'Open the file attachment picker.' },
      { id: 'QUICK_QUOTE', label: 'Quick quote', keys: 'Q', description: 'Quote the selected text when replying to an email.' },
      { id: 'PASTE_AS_LINK', label: 'Paste as link', keys: `${MOD} + V`, description: 'Paste a URL over selected text in a compose window to create a hyperlink.' },
    ],
  },
  {
    id: 'rsvp',
    label: 'RSVP',
    shortcuts: [
      { id: 'RSVP_YES', label: 'RSVP Yes', keys: 'Shift + Y', description: 'RSVP Yes to calendar invites.' },
      { id: 'RSVP_MAYBE', label: 'RSVP Maybe', keys: 'Shift + M', description: 'RSVP Maybe to calendar invites.' },
      { id: 'RSVP_NO', label: 'RSVP No', keys: 'Shift + N', description: 'RSVP No to calendar invites.' },
    ],
  },
  {
    id: 'hoverActions',
    label: 'Hover Actions',
    description:
      "Gmail shortcuts that act on the hovered email when no email is selected. Turn off to use Gmail's default (act on selected email only).",
    shortcuts: [
      { id: 'ARCHIVE', label: 'Archive', keys: 'E', description: 'Archive the selected or hovered email.' },
      { id: 'REPLY', label: 'Reply', keys: 'R', description: 'Reply to the selected or hovered email.' },
      { id: 'REPLY_ALL', label: 'Reply all', keys: 'A', description: 'Reply all to the selected or hovered email.' },
      { id: 'FORWARD', label: 'Forward', keys: 'F', description: 'Forward the selected or hovered email.' },
      { id: 'DELETE_HASH', label: 'Delete', keys: '#', description: 'Delete the selected or hovered email.' },
      { id: 'STAR', label: 'Star', keys: 'S', description: 'Toggle the starred status of the selected or hovered email.' },
      { id: 'MARK_READ', label: 'Mark as read', keys: 'Shift + I', description: 'Mark the selected or hovered email as read.' },
      { id: 'LABEL', label: 'Label', keys: 'L', description: 'Open the label picker for the selected or hovered email.' },
      { id: 'SPAM', label: 'Report spam', keys: '!', description: 'Report the selected or hovered email as spam.' },
      { id: 'SELECT', label: 'Select', keys: 'X', description: 'Select the hovered email in the list.' },
    ],
  },
];

/** Message protocol between the isolated-world bridge and the MAIN-world engine. */
export const BRIDGE_SOURCE = 'gmail-plus-bridge';
export interface BridgeMessage {
  source: typeof BRIDGE_SOURCE;
  type: 'settings';
  enabled: boolean;
  settings: ShortcutSettings;
}
