let apiKey = null;
// Event listener that waits for the extension popup to load
document.addEventListener("DOMContentLoaded", () => {

    // fetches stored number correct and total answers
    chrome.storage.local.get({ answer_stats: { correct: 0, answered: 0 } }, (result) => {
        const { correct, answered } = result.answer_stats;
        document.getElementById("answer_stats").textContent = `${correct} / ${answered}`;
    });

    const mainUI = document.getElementById("main-ui");
    const validating = document.getElementById("validatingKey");
    const enterKey = document.getElementById("enterKey");
    const validKey = document.getElementById("validKey");
    const invalidKey = document.getElementById("invalidKey");
    const keyPrompt = document.getElementById("keyPrompt");

    chrome.storage.local.get({ source: "subject" }, (result) => {
        setInitialChecked(result.source);
        switch (result.source) {
            case "subject":
            console.log("Initial source subject");
            fileInputArea.style.display = "none";
            subjectInputArea.style.display = "block";
            document.getElementsByTagName("html")[0].style.height="290.5px";
            break;
            case "file":
            console.log("Initial source file");
            fileInputArea.style.display = "block";
            subjectInputArea.style.display = "none";
            document.getElementsByTagName("html")[0].style.height="486.5px";
            break;
            case "subject+file":
            console.log("Initial source subject + file");
            fileInputArea.style.display = "block";
            subjectInputArea.style.display = "block";
            document.getElementsByTagName("html")[0].style.height="525px";
            break;
            default:
            console.log("Unknown option");
        }
    });

    // fetching API key from local storage
    chrome.storage.local.get({ key: null }, (result) => {
        apiKey = result.key;
        console.log("Initial API key in popup:", apiKey);
        if (apiKey){
            enterKey.style.display = "none";
            keyPrompt.style.display = "none";
            validating.style.display = "block";
            document.getElementsByTagName("html")[0].style.height="133px";
            validateApiKey(apiKey)
            .then((valid) => {
                if (valid){
                    console.log("API key successfully validated 119");
                    validating.style.display = "none";
                    validKey.style.display = "block";
                    invalidKey.style.display = "none";
                    mainUI.style.display = "block";
                } else {
                    console.log("API key not validated 117");
                    validating.style.display = "none";
                    validKey.style.display = "none";
                    invalidKey.style.display = "block";
                    document.getElementsByTagName("html")[0].style.height="133px";
                }

            });
        } else {
            document.getElementsByTagName("html")[0].style.height="133px";
        }
    });

    const toggleSwitch = document.getElementById("toggle-switch");
    const textInput = document.getElementById("subject-input");
    const keyInput = document.getElementById("key-input");
    const saveButton = document.getElementById("save-button");
    const saveKeyButton = document.getElementById("save-key-button");
    const resetButton = document.getElementById("reset-stats");

    const dropZone = document.getElementById("dropZone");
    const fileInfo = document.getElementById("fileInfo");

    let fileName = null;

    chrome.storage.local.get({ fileData: null }, (result) => {
        if (result.fileData){
          fileName = result.fileData.fileName;
          console.log("Initial fileName:", fileName);
          fileInfo.innerHTML = `<i class="fa fa-save"></i> ${fileName}`;
        } else {
          console.log("No initial file");
        }
    });
  
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
  
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0]; 
        fileInfo.innerHTML = `<i class="fa fa-save"></i> ${file.name}`;
  
        uploadFile(file)
        .then(({ fileUri, expirationTime }) => {
          console.log("File uploaded successfully:", fileUri);
          console.log("Expiration time:", expirationTime);
          console.log("mimeType: ", file.type)
  
          // Store the file name, URI, and expiration time in local storage
          const fileData = {
            fileName: file.name,
            fileUri,
            expirationTime,
            filetype: file.type,
          };

          chrome.runtime.sendMessage({ type: "NEW_FILE", fileData: fileData }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error sending file to background.js:", chrome.runtime.lastError.message);
            } else {
              console.log("File sent successfully:", response);
            }
          });

        })
        .catch((error) => {
          console.error("Error uploading file:", error);
          sendResponse({ message: "File upload failed!", error: error.message });
        });

        
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

    const setInitialChecked = (id) => {
        sourceSelectors.forEach(radio => {
        if (radio.id === id) {
            radio.checked = true;
        } else {
            radio.checked = false;
        }
        });
    };

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

    saveKeyButton.addEventListener("click", () => {
        const key = keyInput.value;
        saveKeyButton.style.backgroundColor = "#90ee90";
        keyInput.value = "";

        setTimeout(() => {
            saveKeyButton.style.backgroundColor = "";
            saveKeyButton.style.color = "";
        }, 200);

        if (key){
            enterKey.style.display = "none";
            keyPrompt.style.display = "none";
            validating.style.display = "block";
            validateApiKey(key)
            .then((valid) => {
                if (valid){
                    console.log("API key successfully validated 119");
                    validating.style.display = "none";
                    validKey.style.display = "block";
                    invalidKey.style.display = "none";
                    mainUI.style.display = "block";
                    chrome.runtime.sendMessage(
                        { type: "SAVE_KEY", key },
                        (response) => {
                            console.log(response.message);
                        }
                    );
                } else {
                    console.log("API key not validated 117");
                    validating.style.display = "none";
                    validKey.style.display = "none";
                    invalidKey.style.display = "block";
                }

            });
        }
    });

    const sourceSelectors = document.querySelectorAll(".selectopt");
    const fileInputArea = document.getElementById("file-input-area");
    const subjectInputArea = document.getElementById("subject-input-area");

    sourceSelectors.forEach(radio => {
      radio.addEventListener("change", (event) => {
        if (event.target.checked) {
            console.log(`Selected option: ${event.target.id}`);
            const source = event.target.id;
            chrome.runtime.sendMessage(
                { type: "SAVE_SOURCE", source},
                (response) => {
                    console.log(response.message);
                }
        );
            switch (event.target.id) {
                case "subject":
                    console.log("Subject selected");
                    fileInputArea.style.display = "none";
                    subjectInputArea.style.display = "block";
                    document.getElementsByTagName("html")[0].style.height="290.5px";
                    break;
                case "file":
                    console.log("File selected");
                    fileInputArea.style.display = "block";
                    subjectInputArea.style.display = "none";
                    document.getElementsByTagName("html")[0].style.height="486.5px";
                    break;
                case "subject+file":
                    console.log("Subject + File selected");
                    fileInputArea.style.display = "block";
                    subjectInputArea.style.display = "block";
                    document.getElementsByTagName("html")[0].style.height="525px";
                    break;
                default:
                    console.log("Unknown option");
          }
        }
      });
    });

    const deleteKeyButtons = document.querySelectorAll('.delete-key-button');

    // Add an event listener to each button
    deleteKeyButtons.forEach(button => {
    button.addEventListener('click', () => {
        key = "";
        console.log("deleting");
        chrome.runtime.sendMessage(
            { type: "DELETE_KEY" },
            (response) => {
                console.log(response.message);
            }
            );
        validating.style.display = "none";
        validKey.style.display = "none";
        invalidKey.style.display = "none";
        enterKey.style.display = "block";
        keyPrompt.style.display = "block";
        mainUI.style.display = "none";
        document.getElementsByTagName("html")[0].style.height="133px";
    });
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

  // cant pass files to between scripts so we gotta do it within the popup script
  async function uploadFile(file) {
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
  const fileBlob = new Blob([file], { type: file.type });
  const fileSize = fileBlob.size;

  const uploadHeaders = {
    "X-Goog-Upload-Command": "start, upload, finalize",
    "X-Goog-Upload-Header-Content-Length": fileSize.toString(),
    "X-Goog-Upload-Header-Content-Type": file.type,
    "X-Goog-Upload-Protocol": "raw",
    "Content-Type": file.type,
  };

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: uploadHeaders,
      body: fileBlob,
    });

    const rawResponse = await response.text();
    console.log("Raw upload response:", rawResponse);

    const data = JSON.parse(rawResponse);
    console.log("Parsed upload response:", data);

    if (!data.file || !data.file.uri) {
      throw new Error("Upload did not return a valid file URI.");
    }
    console.log("File type: ", file.type)
    return { fileUri: data.file.uri, expirationTime: data.file.expirationTime };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

async function validateApiKey(apiKey) {
    const validateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    const validateHeaders = {
        "Content-Type": "application/json",
      };
      
    const body = JSON.stringify({
    contents: [
        {
        role: "user",
        parts: [
            {
            text: "hi",
            },
        ],
        },
    ],
    generationConfig: {
        temperature: 1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1,
        responseMimeType: "text/plain",
    },
    });

    try {
        const response = await fetch(validateUrl, {
        method: "POST",
        headers: validateHeaders,
        body: body,
        });

        return response.ok;

    } catch (error) {
        console.log("error occurred");
        return false;
    }
};