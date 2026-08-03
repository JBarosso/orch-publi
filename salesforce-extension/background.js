// Service worker MV3 : ouvre le side panel au clic sur l'icône, et répond
// aux messages envoyés par le dashboard orch-publi (externally_connectable)
// pour lire / vider les programmations capturées.

const STORAGE_KEY = "programmations";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_PROGRAMMATIONS") {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      sendResponse({ programmations: data[STORAGE_KEY] ?? [] });
    });
    return true;
  }

  if (message?.type === "CLEAR_ALL") {
    chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  return false;
});
