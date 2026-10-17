// This variable stays ALIVE in memory. It never gets wiped.

import { AssembledData } from './types/types';

// Imagine your network APIs or background processes constantly update this object.
let preAssembledData: AssembledData = {
  user: 'Alex',
  notifications: ['Message from Sarah', 'Server update complete'],
  lastUpdated: new Date().toLocaleTimeString(),
};

// Simulate a background process updating your data over time
setInterval(() => {
  preAssembledData.lastUpdated = new Date().toLocaleTimeString();
}, 1000);

// Listen for the popup's request
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PRE_ASSEMBLED_DATA') {
    // Instantly pass the live memory object right back to the popup
    sendResponse(preAssembledData);
  }
});
