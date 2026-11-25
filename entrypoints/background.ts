export default defineBackground(() => {
  // Toolbar button opens the settings.
  (browser.action ?? (browser as any).browserAction).onClicked.addListener(() => {
    void browser.runtime.openOptionsPage();
  });

  // First install: show the welcome splash, which leads into the settings.
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') void browser.tabs.create({ url: browser.runtime.getURL('/options.html#welcome') });
  });
});
