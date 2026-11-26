import { BRIDGE_SOURCE, SHORTCUT_IDS, isEnabled, type BridgeMessage, type ShortcutId, type ShortcutSettings } from '@/utils/shortcuts';
import { BINDINGS, hoverTarget, type Binding, type Ctx } from '@/utils/engine/bindings';
import { chordOf, isSynthetic } from '@/utils/engine/keys';
import { isEditable } from '@/utils/engine/page';
import { setHoverTargeting, startPointerTracking } from '@/utils/engine/pointer';
import { pasteAsLink } from '@/utils/engine/features';
import { setNudgesEnabled } from '@/utils/engine/nudges';

/**
 * GG's shortcut engine. Runs in the page's MAIN world so the key events it
 * sends reach Gmail with real key codes in every browser. Settings arrive from
 * the isolated-world bridge (gmail-bridge.content.ts) via postMessage.
 */
export default defineContentScript({
  matches: ['*://mail.google.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    let shortcutsOn = true;
    let settings: ShortcutSettings = {};
    const on = (id: ShortcutId) => shortcutsOn && isEnabled(settings, id);

    // ---- Settings from the bridge
    const applySettings = () => {
      setHoverTargeting(isEnabled(settings, 'SELECT_ON_HOVER'));
      // With all shortcuts off, nudges show Gmail's own keys instead of GG's.
      const allOff = Object.fromEntries(SHORTCUT_IDS.map((id) => [id, false])) as ShortcutSettings;
      setNudgesEnabled(isEnabled(settings, 'SHORTCUT_NUDGES'), () => (shortcutsOn ? settings : allOff));
    };
    window.addEventListener('message', (e) => {
      const d = e.data as BridgeMessage | undefined;
      if (e.source !== window || d?.source !== BRIDGE_SOURCE || d.type !== 'settings') return;
      shortcutsOn = d.enabled;
      settings = d.settings ?? {};
      applySettings();
    });
    window.postMessage({ source: 'gg-engine', type: 'request-settings' }, location.origin);

    // ---- Key matching
    const SEQUENCE_MS = 1200;
    // Gmail's own two-key shortcuts start with these; their second key belongs to Gmail.
    const GMAIL_PREFIXES = new Set(['g', 'shift+8']);
    let prev: { chord: string; at: number } | null = null;

    const index = new Map<string, Binding[]>();
    for (const b of BINDINGS) for (const k of b.keys) index.set(k, [...(index.get(k) ?? []), b]);

    function candidates(chord: string): { bindings: Binding[]; digit?: number } {
      const recent = prev && Date.now() - prev.at <= SEQUENCE_MS ? prev.chord : null;
      if (recent) {
        const seq = index.get(`${recent} ${chord}`);
        if (seq) return { bindings: seq };
        if (recent === 'g' && /^[1-9]$/.test(chord)) return { bindings: index.get('g digit') ?? [], digit: Number(chord) };
        if (GMAIL_PREFIXES.has(recent)) return { bindings: [] }; // e.g. "g i": let Gmail have it
      }
      return { bindings: index.get(chord) ?? [] };
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isSynthetic(e) || e.isComposing || e.repeat) return;
      const chord = chordOf(e);
      if (!chord) return;

      const { bindings, digit } = shortcutsOn ? candidates(chord) : { bindings: [] };
      prev = { chord, at: Date.now() };
      if (!bindings.length) return;

      const typing = isEditable(e.target);
      const ctx: Ctx = { event: e, typing, hover: hoverTarget(), digit, on };

      for (const b of bindings) {
        if (!on(b.id)) continue;
        if (typing && !b.whileTyping) continue;
        if (b.when && !b.when(ctx)) continue;
        const result = b.run(ctx);
        if (result === false) return; // the binding chose to let Gmail handle it
        e.preventDefault();
        e.stopImmediatePropagation();
        prev = null; // a completed shortcut doesn't start a new sequence
        if (result instanceof Promise) result.catch((err) => console.warn('[GG]', b.id, err));
        return;
      }
    }

    // Capture phase on window: runs before Gmail's own key handlers.
    window.addEventListener('keydown', onKeyDown, true);

    document.addEventListener('paste', (e) => on('PASTE_AS_LINK') && pasteAsLink(e), true);

    const start = () => {
      startPointerTracking();
      applySettings();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  },
});
