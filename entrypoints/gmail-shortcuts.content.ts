import { BRIDGE_SOURCE, SHORTCUT_IDS, isEnabled, type BridgeMessage, type ShortcutId, type ShortcutSettings } from '@/utils/shortcuts';
import {
  hasSelection,
  hasTextSelection,
  isFullComposeOpen,
  isGmailModalOpen,
  isInboxLikeView,
  isInCompose,
  isListView,
  isSplitPane,
  isSynthetic,
  isTypingTarget,
  isUnread,
  listRows,
  sendGmail,
  sendSequence,
  setHash,
  threadMessageCount,
  waitFor,
} from '@/utils/gmail/dom';
import { armTarget, hoveredRow, setHoverEnabled, startHoverTracking, targetRow, toggleHovered } from '@/utils/gmail/hover';
import * as A from '@/utils/gmail/actions';
import { setNudgesEnabled } from '@/utils/gmail/nudges';

/**
 * The shortcut engine. Runs in the page's MAIN world so synthetic keyboard
 * events reach Gmail with correct keyCodes in both Chromium and Firefox.
 */
export default defineContentScript({
  matches: ['*://mail.google.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    let masterEnabled = true;
    let settings: ShortcutSettings = {};
    const on = (id: ShortcutId) => masterEnabled && isEnabled(settings, id);

    window.addEventListener('message', (e) => {
      const d = e.data as BridgeMessage | undefined;
      if (e.source !== window || d?.source !== BRIDGE_SOURCE || d.type !== 'settings') return;
      masterEnabled = d.enabled;
      settings = d.settings ?? {};
      syncNudges();
    });
    const syncNudges = () => {
      // With all shortcuts off, nudges fall back to Gmail's native keys.
      const allOff = Object.fromEntries(SHORTCUT_IDS.map((id) => [id, false])) as ShortcutSettings;
      setNudgesEnabled(isEnabled(settings, 'SHORTCUT_NUDGES'), () => (masterEnabled ? settings : allOff));
      setHoverEnabled(isEnabled(settings, 'SELECT_ON_HOVER'));
    };
    window.postMessage({ source: 'gmail-plus-engine', type: 'request-settings' }, window.location.origin);

    // Sequence tracking for "g <x>" combos.
    let lastKey: number | null = null;
    let lastKeyAt = 0;
    const SEQ_MS = 1500;
    const after = (keyCode: number, ms = SEQ_MS) => lastKey === keyCode && Date.now() - lastKeyAt <= ms;
    let lastG = 0;

    const stop = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isSynthetic(e) || !masterEnabled) return;
      try {
        handle(e);
      } finally {
        if (![16, 17, 18, 91, 93].includes(e.keyCode)) {
          lastKey = e.keyCode;
          lastKeyAt = Date.now();
        }
      }
    };

    const handle = (e: KeyboardEvent) => {
      const k = e.keyCode;
      const noMods = !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey;
      const isMac = /Mac/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const typing = isTypingTarget(e.target);
      const list = isListView();
      // "Actionable": in a list, or hovering a row (thread actions are left to Gmail).
      const actionable = list || !!hoveredRow();

      // ---- Escape while a Gmail dialog is open
      if (e.key === 'Escape' && isGmailModalOpen()) {
        if (!on('ESCAPE_SMART')) return;
        A.closeModal();
        return stop(e);
      }
      if (isGmailModalOpen()) return;

      // ---- g g / Shift+G: jump to top / bottom of the list
      if (!typing && k === 71) {
        if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (on('GO_TO_BOTTOM') && listRows().length) {
            stop(e);
            A.goToEdge('bottom');
          }
          lastG = 0;
          return;
        }
        if (noMods) {
          const now = Date.now();
          if (lastG && now - lastG <= 400) {
            lastG = 0;
            if (on('GO_TO_TOP') && listRows().length) {
              stop(e);
              lastKey = null; // don't treat as a "g" prefix
              A.goToEdge('top');
              return;
            }
          } else lastG = now;
        }
      }

      // ---- g <digit>: switch account
      if (!typing && noMods && k >= 49 && k <= 57 && after(71) && on('GO_ACCOUNT')) {
        stop(e);
        window.location.href = `https://mail.google.com/mail/u/${k - 49}/#inbox`;
        return;
      }
      // ---- g ! / g #: spam / trash
      if (!typing && e.shiftKey && !mod && after(71) && on('GO_SPAM_TRASH')) {
        if (k === 49) return stop(e), setHash('#spam');
        if (k === 51) return stop(e), setHash('#trash');
      }

      // ---- B / H: snooze
      if (noMods && !typing && (k === 66 || k === 72) && !after(71)) {
        const id: ShortcutId = k === 66 ? 'SNOOZE_B' : 'SNOOZE_H';
        if (!on(id)) return;
        if (actionable) {
          if (hasSelection() && k === 66) return; // native
          stop(e);
          armTarget();
          setTimeout(() => sendGmail('snooze'), 50);
        } else if (k === 72) {
          stop(e);
          sendGmail('snooze');
        }
        return;
      }

      const hasMain = document.querySelector('[role="main"]') !== null;
      const composeDialog = isFullComposeOpen();

      // ---- Thread view: arrows and Enter
      if (hasMain && !list && !typing && !composeDialog && !hasTextSelection()) {
        const plain = !e.shiftKey && !e.ctrlKey && !e.metaKey;
        if (k === 37 && plain && on('ARROW_LEFT')) return e.preventDefault(), sendGmail('newer');
        if (k === 39 && plain && on('ARROW_RIGHT')) return e.preventDefault(), sendGmail('older');
        if (k === 13 && on('ENTER_REPLY')) {
          stop(e);
          sendGmail(A.hasCollapsedMessage() ? 'open' : 'replyAll');
          return;
        }
        if (!isSplitPane() && threadMessageCount() > 1) {
          if (k === 38 && plain && on('ARROW_UP')) return e.preventDefault(), sendGmail('prevMessage');
          if (k === 40 && plain && on('ARROW_DOWN')) return e.preventDefault(), sendGmail('nextMessage');
        }
      }

      // ---- List view: arrows page through results
      if (list && !typing && !composeDialog && !hasTextSelection()) {
        const plain = !e.shiftKey && !e.ctrlKey && !e.metaKey;
        if (k === 37 && plain && on('ARROW_LEFT')) return e.preventDefault(), sendSequence(['g', 'p']);
        if (k === 39 && plain && on('ARROW_RIGHT')) return e.preventDefault(), sendSequence(['g', 'n']);
      }

      // ---- Alt+/: copy link to this email
      if (!typing && e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && (e.code === 'Slash' || e.key === '/' || k === 191)) {
        if (!on('COPY_PAGE_LINK')) return;
        stop(e);
        void A.copyPageLink();
        return;
      }

      // ---- Cmd/Ctrl combos
      if (mod) {
        if (k === 90 && !typing && !e.shiftKey) {
          if (on('UNDO')) stop(e), sendGmail('undo');
          return;
        }
        if (k === 65 && !typing && list && !e.shiftKey) {
          if (on('SELECT_ALL')) stop(e), sendGmail('asterisk'), setTimeout(() => sendGmail('a'), 50);
          return;
        }
        if (k === 76 && e.shiftKey && typing) {
          if (on('SCHEDULE_SEND')) stop(e), A.scheduleSend();
          return;
        }
        if (k === 83 && e.shiftKey && typing) {
          if (on('EDIT_SUBJECT')) stop(e), A.editSubject();
          return;
        }
        if (k === 65 && e.shiftKey && typing) {
          if (on('ATTACH_FILE')) stop(e), A.attachFile();
          return;
        }
        if (k === 85 && !e.shiftKey && !typing) {
          if (on('UNSUBSCRIBE')) stop(e), void A.unsubscribe();
          return;
        }
        if (k === 67 && !e.shiftKey && !typing && !hasTextSelection() && !list) {
          if (on('INSTANT_COPY')) stop(e), void A.instantCopy();
          return;
        }
        if (k === 73 && e.shiftKey && !typing && !list && !after(71)) {
          if (on('REPLY_TO_INTRO')) stop(e), void A.replyToIntro();
          return;
        }
        return;
      }

      // ---- Escape: smart escape
      if (k === 27 || e.key === 'Escape') {
        if (!on('ESCAPE_SMART')) return;
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; // let Gmail handle search box etc.
        if (isInCompose(t) && !document.querySelector('.I5.bzE')) return;
        A.smartEscape(e, { closeToasts: on('ESCAPE_CLOSE_TOASTS') });
        return;
      }

      if (typing) return;
      const shiftOnly = e.shiftKey && !e.altKey;
      const noCtrl = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!noCtrl) return;

      // ---- RSVP
      if (shiftOnly && (k === 89 || k === 77 || k === 78)) {
        const kind = k === 89 ? 'RSVP_YES' : k === 77 ? 'RSVP_MAYBE' : 'RSVP_NO';
        if (!on(kind)) return;
        stop(e);
        void A.rsvp(kind, on('ARCHIVE_AFTER_RSVP'));
        return;
      }

      // ---- E: archive
      if (k === 69 && !e.shiftKey) {
        if (!on('ARCHIVE') || !actionable) return;
        stop(e);
        const row = targetRow();
        armTarget();
        if (on('ARCHIVE_MARKS_READ') && isUnread(row)) {
          sendGmail('read');
          void waitFor(() => !row!.isConnected || !isUnread(row), 400, 25).then(() => sendGmail('archive'));
        } else setTimeout(() => sendGmail('archive'), 50);
        return;
      }

      // ---- R: reply
      if (k === 82 && !e.shiftKey) {
        if (!on('REPLY') || !actionable) return;
        stop(e);
        armTarget();
        sendGmail('open');
        setTimeout(() => sendGmail('reply'), 50);
        return;
      }

      // ---- V: move to inbox / move to
      if (k === 86 && !e.shiftKey) {
        if (!isInboxLikeView()) {
          if (!on('MOVE_INBOX')) return;
          stop(e);
          if (actionable) armTarget();
          setTimeout(A.moveToInbox, 200);
          return;
        }
        if (actionable && on('MOVE_INBOX')) {
          stop(e);
          armTarget();
          setTimeout(() => sendGmail('move'), 50);
        }
        return;
      }

      // ---- F: forward
      if (k === 70 && !e.shiftKey && !after(71)) {
        if (!on('FORWARD') || !actionable) return;
        stop(e);
        armTarget();
        sendGmail('open');
        setTimeout(() => sendGmail('forward'), 50);
        return;
      }

      // ---- Q: quick quote
      if (k === 81 && !e.shiftKey && !list && hasTextSelection()) {
        if (!on('QUICK_QUOTE')) return;
        stop(e);
        A.quickQuote();
        return;
      }

      // ---- A: reply all
      if (k === 65 && !e.shiftKey && !after(71) && !after(56)) {
        if (!on('REPLY_ALL') || !actionable) return;
        stop(e);
        armTarget();
        sendGmail('open');
        setTimeout(() => sendGmail('replyAll'), 50);
        return;
      }

      // ---- #: delete
      if (k === 51 && e.shiftKey && !after(71)) {
        if (!on('DELETE_HASH') || !actionable) return;
        stop(e);
        armTarget();
        setTimeout(() => sendGmail('delete'), 50);
        return;
      }

      // ---- Del / Backspace: delete
      if (k === 46 || k === 8) {
        if (!on(k === 46 ? 'DELETE_KEY' : 'DELETE_BACKSPACE')) return;
        stop(e);
        if (actionable) {
          armTarget();
          setTimeout(() => sendGmail('delete'), 50);
        } else sendGmail('delete');
        return;
      }

      // ---- S: star / Shift+S: star and archive
      if (k === 83 && !after(71)) {
        if (!e.shiftKey) {
          if (!on('STAR')) return;
          stop(e);
          const how = actionable ? armTarget() : null;
          setTimeout(() => {
            sendGmail('star');
            if (how === 'pointer' || how === 'cursor') sendSequence(['asterisk', 'n'], 0);
          }, 50);
          return;
        }
        if (!on('STAR_AND_ARCHIVE')) return;
        stop(e);
        if (actionable) armTarget();
        setTimeout(() => sendGmail('star'), 50);
        setTimeout(() => sendGmail('archive'), 150);
        return;
      }

      // ---- U: toggle read/unread
      if (k === 85 && !e.shiftKey && !after(56)) {
        if (!on('TOGGLE_UNREAD')) return;
        stop(e);
        if (actionable) {
          const row = targetRow();
          const how = armTarget();
          setTimeout(() => {
            sendGmail(isUnread(row) ? 'read' : 'unread');
            if (how !== 'selection') sendSequence(['asterisk', 'n'], 0);
          }, 50);
        } else setTimeout(() => sendGmail('unread'), 50);
        return;
      }

      // ---- Shift+I: mark read
      if (k === 73 && e.shiftKey) {
        if (!on('MARK_READ') || !actionable) return;
        stop(e);
        const how = armTarget();
        setTimeout(() => {
          sendGmail('read');
          if (how !== 'selection') sendSequence(['asterisk', 'n'], 0);
        }, 50);
        return;
      }

      // ---- L: label / Shift+1: spam (only when nothing is selected)
      if ((k === 76 && !e.shiftKey) || (k === 49 && e.shiftKey && !after(71))) {
        const id: ShortcutId = k === 76 ? 'LABEL' : 'SPAM';
        if (!on(id) || !actionable || hasSelection()) return;
        stop(e);
        armTarget();
        setTimeout(() => sendGmail(k === 76 ? 'label' : 'spam'), 50);
        return;
      }

      // ---- X: select hovered row
      if (k === 88 && !e.shiftKey) {
        if (!on('SELECT') || !actionable) return;
        stop(e);
        toggleHovered();
        return;
      }

      // ---- Shift+↑/↓ (or Shift+J/K): extend selection
      if (e.shiftKey) {
        const up = ['ArrowUp', 'k', 'K'].includes(e.key);
        const down = ['ArrowDown', 'j', 'J'].includes(e.key);
        if (!up && !down) return;
        const active = document.activeElement;
        if (!(active?.classList.contains('zA') || active?.tagName === 'BODY')) return;
        if (!on('MULTI_SELECT')) return;
        A.extendSelection(e, down ? 'down' : 'up');
      }
    };

    window.addEventListener('keydown', onKeyDown, true);

    document.addEventListener(
      'paste',
      (e) => {
        if (on('PASTE_AS_LINK')) A.handlePasteAsLink(e);
      },
      true,
    );

    const start = () => {
      startHoverTracking();
      syncNudges();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  },
});
