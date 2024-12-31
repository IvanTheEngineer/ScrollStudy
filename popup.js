// Event listener that waits for the extension popup to load
document.addEventListener("DOMContentLoaded", () => {

    // fetches stored number correct and total answers
    chrome.storage.local.get({ answer_stats: { correct: 0, answered: 0 } }, (result) => {
        const { correct, answered } = result.answer_stats;
        document.getElementById("answer_stats").textContent = `${correct} / ${answered}`;
    });

    const toggleSwitch = document.getElementById("toggle-switch");
    const textInput = document.getElementById("subject-input");
    const saveButton = document.getElementById("save-button");

    // fetches state of on/off button from local storage
    chrome.storage.local.get({ On: false }, (result) => {
        const isEnabled = result.On;
        toggleSwitch.checked = isEnabled;
        console.log("Initial On/Off State in popup:", isEnabled ? "On" : "Off");
    });

    // fetches state of subject input from local storage
    chrome.storage.local.get({ subject: null }, (result) => {
        if (result.subject) {
            const subject = result.subject;
            textInput.value = subject;
            console.log("Saved subject: ", subject);
        }
    });

    // event listener for on/off switch changes which sends an update to background.js to store it
    toggleSwitch.addEventListener("change", () => {
        const isEnabled = toggleSwitch.checked;

        chrome.runtime.sendMessage({ type: "TOGGLE_ON", enabled: isEnabled }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error sending message to background.js:", chrome.runtime.lastError.message);
            } else {
              console.log("Message sent successfully:", response);
            }
          });
    });

    // event listener for save button click to send updated subject to background.js for local storage
    saveButton.addEventListener("click", () => {
        const text = textInput.value;

        chrome.runtime.sendMessage(
        { type: "SAVE_SUBJECT", text },
        (response) => {
            console.log(response.message);
        }
        );
    });
  });
