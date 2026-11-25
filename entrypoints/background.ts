export default defineBackground(() => {
  // Toolbar button opens the shortcut settings.
  (browser.action ?? (browser as any).browserAction).onClicked.addListener(() => {
    void browser.runtime.openOptionsPage();
  });
});
