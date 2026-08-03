/** Toolbar click opens the full-page app tab instead of a tiny popup. */
const appUrl = chrome.runtime.getURL("/app.html");

void chrome.tabs.create({ url: appUrl, active: true }).finally(() => {
  window.close();
});
