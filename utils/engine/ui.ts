/** Small UI helpers shown inside Gmail: a status toast and clipboard writes. */

export const TOAST_ID = 'gg-toast';

let toastTimer: number | undefined;

export function toast(message: string, tone: 'info' | 'success' | 'error' = 'info'): void {
  let el = document.getElementById(TOAST_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = TOAST_ID;
    el.setAttribute('role', 'status');
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      bottom: '24px',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      padding: '10px 16px',
      borderRadius: '10px',
      font: "500 14px 'Google Sans', Roboto, Arial, sans-serif",
      color: '#f5f5f3',
      boxShadow: '0 6px 20px rgba(0,0,0,.25)',
      pointerEvents: 'none',
      transition: 'opacity .2s',
    });
    document.body.appendChild(el);
  }
  el.style.background = tone === 'error' ? '#9b2a26' : tone === 'success' ? '#1f5d3a' : '#161618';
  el.textContent = message;
  el.style.opacity = '1';
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el && (el.style.opacity = '0'), 2800);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Copy rich HTML with a plain-text fallback. */
export async function copyRich(html: string, text: string): Promise<boolean> {
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
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
