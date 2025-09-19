// Background script: open popup on install and bridge messages if needed

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Open onboarding tab with our login page (no user gesture required)
    const url = chrome.runtime.getURL('src/popup/popup.html');
    try { await chrome.tabs.create({ url }); } catch (e) {}
  }
});

// Relay session updates to all tabs on skool.com
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'LA_SESSION_UPDATED') {
    chrome.tabs.query({ url: ['https://*.skool.com/*', 'https://skool.com/*'] }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, message);
      }
    });
  }
});

