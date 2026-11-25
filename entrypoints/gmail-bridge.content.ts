import '@/assets/gmail.css';
import { BRIDGE_SOURCE, MASTER_KEY, SETTINGS_KEY, type BridgeMessage, type ShortcutSettings } from '@/utils/shortcuts';

/**
 * Isolated-world content script. The shortcut engine runs in the page's MAIN
 * world (so synthetic key events carry the right keyCode in every browser),
 * where extension storage is unavailable. This bridge forwards settings to it.
 */
export default defineContentScript({
  matches: ['*://mail.google.com/*'],
  runAt: 'document_start',
  async main() {
    const push = async () => {
      const data = await browser.storage.sync.get([SETTINGS_KEY, MASTER_KEY]);
      const msg: BridgeMessage = {
        source: BRIDGE_SOURCE,
        type: 'settings',
        enabled: data[MASTER_KEY] !== false,
        settings: (data[SETTINGS_KEY] as ShortcutSettings) ?? {},
      };
      window.postMessage(msg, window.location.origin);
    };

    window.addEventListener('message', (e) => {
      if (e.source === window && e.data?.source === 'gmail-plus-engine' && e.data?.type === 'request-settings') {
        void push();
      }
    });

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && (SETTINGS_KEY in changes || MASTER_KEY in changes)) void push();
    });

    await push();
  },
});
