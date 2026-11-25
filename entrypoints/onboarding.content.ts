import { GLOBAL_KEY, MASTER_KEY, ONBOARDED_KEY } from '@/utils/shortcuts';
import { accountEmail, sleep, waitFor } from '@/utils/engine/page';

/**
 * One-time setup per Gmail account: GG's shortcuts build on Gmail's own, which
 * are off by default. The first time GG sees an account, it opens Gmail's
 * General settings, turns "Keyboard shortcuts on" on if it isn't, saves, and
 * remembers the account so it never does this again.
 */
export default defineContentScript({
  matches: ['*://mail.google.com/*'],
  runAt: 'document_idle',
  async main() {
    if (window.top !== window) return;

    const sync = await browser.storage.sync.get([GLOBAL_KEY, MASTER_KEY]);
    if (sync[GLOBAL_KEY] === false || sync[MASTER_KEY] === false) return;

    // Gmail puts the signed-in address in the tab title once the app has loaded.
    const email = await waitFor(() => (document.querySelector('[role="main"]') ? accountEmail() : null), 30_000);
    if (!email) return;
    const key = email.toLowerCase();

    const local = await browser.storage.local.get(ONBOARDED_KEY);
    const done = (local[ONBOARDED_KEY] as Record<string, number> | undefined) ?? {};
    if (done[key]) return;
    // Mark first so a reload during setup can never loop.
    await browser.storage.local.set({ [ONBOARDED_KEY]: { ...done, [key]: Date.now() } });

    const returnTo = location.hash && !location.hash.startsWith('#settings') ? location.hash : '#inbox';
    const note = banner('GG is turning on Gmail’s keyboard shortcuts for this account…');
    location.hash = '#settings/general';

    const radio = await waitFor(findShortcutsOnRadio, 15_000);
    if (!radio) {
      note.done('Couldn’t find Gmail’s keyboard shortcut setting. Turn it on in Settings → General.', true);
      location.hash = returnTo;
      return;
    }
    if (radio.checked) {
      note.done('Gmail’s keyboard shortcuts are already on. GG is ready.');
      location.hash = returnTo;
      return;
    }

    radio.click();
    await sleep(150);
    const save = await waitFor(findSaveButton, 5_000);
    if (!save) {
      note.done('Turned on keyboard shortcuts. Click “Save Changes” at the bottom to finish.', true);
      return;
    }
    note.done('Gmail’s keyboard shortcuts are on. GG is ready.');
    save.click(); // Gmail saves and reloads itself
  },
});

/** The "Keyboard shortcuts on" radio in Settings → General. */
function findShortcutsOnRadio(): HTMLInputElement | null {
  // Gmail's form field for this setting; value 0 is "on".
  const byName = document.querySelector<HTMLInputElement>('input[type="radio"][name="bx_hs"][value="0"]');
  if (byName) return byName;
  for (const label of document.querySelectorAll('label')) {
    if (!/^\s*keyboard shortcuts on\s*$/i.test(label.textContent ?? '')) continue;
    const id = label.getAttribute('for');
    const input = (id && document.getElementById(id)) || label.parentElement?.querySelector('input[type="radio"]');
    if (input instanceof HTMLInputElement) return input;
  }
  return null;
}

function findSaveButton(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>('button, [role="button"]');
  for (const el of candidates) {
    if (/^\s*save changes\s*$/i.test(el.textContent ?? '') && !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true') {
      return el;
    }
  }
  return null;
}

/** A small branded notice at the bottom of Gmail while setup runs. */
function banner(text: string) {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  Object.assign(el.style, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 18px 12px 14px',
    borderRadius: '12px',
    background: '#161618',
    color: '#f5f5f3',
    font: "500 14px 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif",
    boxShadow: '0 10px 30px -10px rgba(0,0,0,.45)',
    transform: 'translate(-50%, 16px)',
    opacity: '0',
    transition: 'opacity .3s ease, transform .45s cubic-bezier(.2,.9,.25,1.15)',
  } satisfies Partial<CSSStyleDeclaration>);
  const dot = document.createElement('span');
  Object.assign(dot.style, { width: '8px', height: '8px', borderRadius: '50%', background: '#398eff', flexShrink: '0' });
  const label = document.createElement('span');
  label.textContent = text;
  el.append(dot, label);
  document.body.append(el);
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, 0)';
  });
  return {
    done(message: string, warn = false) {
      label.textContent = message;
      dot.style.background = warn ? '#fc413d' : '#3ecf8e';
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%, 16px)';
        setTimeout(() => el.remove(), 500);
      }, warn ? 8000 : 4000);
    },
  };
}
