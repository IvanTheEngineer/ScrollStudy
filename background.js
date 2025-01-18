let answerStats = { correct: 0, answered: 0 };
let On = false;


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in background.js:", message);
    // stores updated answer stats sent from replace.js to local storage
    if (message.type === "UPDATE_ANSWER_STATS") {
        chrome.storage.local.set({ answer_stats: message.answer_stats }, () => {
            console.log("Answer stats updated:", message.answer_stats);
            sendResponse({ success: true });
        });
        return true;
    } else if (message.type === "RESET_ANSWER_STATS") {
      chrome.storage.local.set({ answer_stats: message.answer_stats }, () => {
        console.log("Answer stats updated:", message.answer_stats);

        // Notify all content scripts about the updated state
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {
              type: "RESET_ANSWER_STATS",
              answer_stats: message.answer_stats,
            });
          });
        });

        sendResponse({ success: true });
      });
      return true;
    } else if (message.type === "TOGGLE_ON") {
        // Updates the toggle state in storage
        chrome.storage.local.set({ On: message.enabled }, () => {
          console.log("On/Off State Updated (background):", message.enabled);
    
          // Notify all content scripts about the updated state
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              chrome.tabs.sendMessage(tab.id, {
                type: "TOGGLE_ON_UPDATE",
                enabled: message.enabled,
              });
            });
          });
    
          sendResponse({ success: true });
        });
      } else if (message.type === "SAVE_SUBJECT") {
        const subject = message.text;
        // locally stores updated subject sent from popup.js
        chrome.storage.local.set({ subject: subject }, () => {
          console.log("subject saved:", subject);
          sendResponse({ message: "subject successfully saved!" });
        });
    
        return true;
      } else if (message.type === "SAVE_KEY") {
        const key = message.key;
        // locally stores updated subject sent from popup.js
        chrome.storage.local.set({ key: key }, () => {
          console.log("key saved:", key);
          sendResponse({ message: "key successfully saved!" });
        });
    
        return true;
      } else if (message.type === "NEW_FILE") {
        fileData = message.fileData;
        chrome.storage.local.set({ fileData: fileData }, () => {
          console.log("File data saved:", fileData);
          sendResponse({ message: "File successfully saved!", ...fileData });
        });
        // Indicate that sendResponse will be called asynchronously
        return true;
      } else if (message.type === "DELETE_KEY") {
        chrome.storage.local.remove('key', () => {
          console.log("key deleted");
          sendResponse({ message: "key successfully deleted!" });
        });
        return true;
      } else if (message.type === "SAVE_SOURCE") {
        source = message.source;

        chrome.storage.local.set({ source: source }, () => {
          console.log("source saved");
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              chrome.tabs.sendMessage(tab.id, {
                type: "UPDATE_SOURCE",
                source: source,
              });
            });
          });
          
          sendResponse({ message: "source successfully saved!" });
        });
        return true;
      } else {
        console.warn("Unknown message type received:", message.type);
      }
    
});