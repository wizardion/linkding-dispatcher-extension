// Function to create the offscreen document safely
async function setupOffscreen() {
  // Check if it's already running to avoid duplicates
  if (await chrome.offscreen.hasDocument()) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['LOCAL_STORAGE'], // Required reason flag by Chrome API
    justification: 'Keep heavy UI data structures pre-assembled in memory',
  });
}

// Spin it up on installation or browser startup
chrome.runtime.onInstalled.addListener(setupOffscreen);
chrome.runtime.onStartup.addListener(setupOffscreen);
