import { defineConfig } from 'wxt';
import { loadEnv } from 'vite';

// Local dev browser settings come from .env / .env.local (gitignored):
//   CHROMIUM_BINARY  - path to a Chromium-based browser (e.g. Brave)
//   CHROMIUM_PROFILE - path to a profile folder (e.g. ...\User Data\Default)
//   FIREFOX_BINARY   - optional path to Firefox
const env = loadEnv('development', process.cwd(), '');


export default defineConfig({
  // MV3 everywhere: Firefox 128+ supports MAIN-world content scripts in MV3.
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'GG – Greater experience for Gmail™',
    short_name: 'GG',
    description: 'Faster keyboard shortcuts and a cleaner look for Gmail™, built for reaching inbox zero. Gmail is a trademark of Google LLC.',
    permissions: ['storage'],
    host_permissions: ['*://mail.google.com/*'],
    action: { default_title: 'GG settings' },
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: { id: 'gg@local', strict_min_version: '128.0' },
      },
    }),
  }),
  webExt: {
    // Branded Chrome 136+ blocks loading extensions into its default profile
    // via remote debugging. Set DEV_LAUNCH_BROWSER=false to skip auto-launch
    // and "Load unpacked" .output/chrome-mv3-dev once instead (still hot-reloads).
    disabled: env.DEV_LAUNCH_BROWSER === 'false',
    binaries: {
      ...(env.CHROMIUM_BINARY && { chrome: env.CHROMIUM_BINARY }),
      ...(env.FIREFOX_BINARY && { firefox: env.FIREFOX_BINARY }),
    },
    // web-ext detects a profile dir (e.g. "...\User Data\Default") and uses
    // its parent as --user-data-dir with --profile-directory=Default.
    ...(env.CHROMIUM_PROFILE && { chromiumProfile: env.CHROMIUM_PROFILE }),
    keepProfileChanges: true,
    startUrls: ['https://mail.google.com/'],
  },
});
