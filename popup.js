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
    const resetButton = document.getElementById("reset-stats");

    const dropZone = document.getElementById("dropZone");
    const fileInfo = document.getElementById("fileInfo");
  
    // Add event listeners for drag-and-drop functionality
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("dragover");
    });
  
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragover");
    });
  
    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragover");
  
      const files = event.dataTransfer.files; // Retrieve the file
      if (files.length > 0) {
        const file = files[0]; 
        fileInfo.textContent = `File name: ${file.name}, size: ${file.size} bytes`;
  
        // Process the file
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log("File content:", e.target.result);
          // Send the file data to the background script or process it locally
        };
        reader.readAsArrayBuffer(file);
      }
    });

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
        saveButton.style.backgroundColor = "#90ee90";

        setTimeout(() => {
            saveButton.style.backgroundColor = "";
            saveButton.style.color = "";
        }, 200);

        chrome.runtime.sendMessage(
        { type: "SAVE_SUBJECT", text },
        (response) => {
            console.log(response.message);
        }
        );
    });


    resetButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ 
            type: "RESET_ANSWER_STATS", 
            answer_stats: { correct: 0, answered: 0 }
        }, (response) => {
            // Debug
            if (chrome.runtime.lastError) {
                console.error("Error sending message to background.js:", chrome.runtime.lastError.message);
            } else {
                console.log("Response from background.js:", response);
            }
        });
        document.getElementById("answer_stats").textContent = `${0} / ${0}`;
    });

  });
