// Background script: open popup on install and bridge messages if needed
import { checkStatus, postChat } from '../lib/api.js';

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Open onboarding tab with our login page (no user gesture required)
    const url = chrome.runtime.getURL('src/popup/popup.html');
    try { await chrome.tabs.create({ url }); } catch (e) {}
  }
  // On install/update: purge invalid legacy sessions
  try {
    chrome.storage.sync.get(['la_session'], ({ la_session }) => {
      const s = la_session;
      const isValid = s && s.token && s.validated && s.source === 'supabase';
      if (!isValid) chrome.storage.sync.remove('la_session');
    });
  } catch {}
});

// Relay session updates to all tabs on skool.com
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'LA_SESSION_UPDATED') {
    // If session looks like old mock, drop it and notify clients
    const s = message.payload;
    const isMock = s && (!s.token || !s.validated || s.token === 'mock-token');
    if (isMock) {
      chrome.storage.sync.remove('la_session');
      chrome.tabs.query({ url: ['https://*.skool.com/*', 'https://skool.com/*'] }, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'LA_SESSION_UPDATED', payload: null }, () => { void chrome.runtime.lastError; });
        }
      });
      return;
    }
    chrome.tabs.query({ url: ['https://*.skool.com/*', 'https://skool.com/*'] }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, message, () => { void chrome.runtime.lastError; });
      }
    });
  }
  if (message?.type === 'LA_CHECK_STATUS') {
    (async () => {
      try {
        const data = await checkStatus(message.token);
        sendResponse({ ok: true, data });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || 'Failed', status: e?.status });
      }
    })();
    return true;
  }
  if (message?.type === 'LA_CHAT_REQUEST') {
    (async () => {
      try {
        const data = await postChat({ token: message.token, organizationId: message.organizationId, message: message.text, threadId: message.threadId });
        sendResponse({ ok: true, data });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || 'Failed', status: e?.status });
      }
    })();
    return true;
  }
});

// On browser startup, ensure no legacy/mock session remains
try {
  chrome.runtime.onStartup.addListener(() => {
    chrome.storage.sync.get(['la_session'], ({ la_session }) => {
      const s = la_session;
      const isValid = s && s.token && s.validated && s.source === 'supabase';
      if (!isValid) chrome.storage.sync.remove('la_session');
    });
  });
} catch {}

