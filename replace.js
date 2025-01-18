let questionlist = [];
let geminiCalled = false;
let answered = 0;
let correct = 0;
let On = false;
let FeedObserver = null;
let fileUri = null
let fileData = null
let mimeType = null
let apiKey = null
let source = null;

// fetching API key from local storage
chrome.storage.local.get({ key: null }, (result) => {
  apiKey = result.key;
  console.log("Initial API key:", apiKey);
});

// function to sop looking at the feed by disconnecting the oserver
function stopFeedObserver() {
    if (FeedObserver) {
        FeedObserver.disconnect();
        FeedObserver = null;
    }
  }

// fetches initial state of the on/off button
chrome.storage.local.get({ On: false }, (result) => {
    On = result.On;
    console.log("Initial On/Off State in replace.js:", On);
    if (On){
        waitForFeed();
    }
});

// fetches initial state of the source
chrome.storage.local.get({ source: "subject" }, (result) => {
  source = result.source;
  console.log("Initial source in replace.js:", source);
});

// fetches initial fileUri
chrome.storage.local.get({ fileData: null }, (result) => {
  if (result.fileData && result.fileData.fileUri && result.fileData.filetype){
    fileUri = result.fileData.fileUri;
    mimeType = result.fileData.filetype;
    console.log("Initial fireUri:", fileUri);
    console.log("Initial mimeType:", mimeType);
  } else {
    console.log("No initial file");
  }
});

// Listens to any updates of the on/off button from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_ON_UPDATE") {
    On = message.enabled;
    console.log("On/Off Updated (replace.js):", On);
    if (On) {
        waitForFeed();
    }
    else {
        stopFeedObserver();
    }
  } else if (message.type === "RESET_ANSWER_STATS") {
    answered = message.answer_stats.answered;
    correct = message.answer_stats.correct;
  } else if (message.type === "UPDATE_SOURCE") {
    source = message.source;
    console.log("Source Updated (replace.js):", source);
  }
});

// Replaces occasional tweets with questions
function replaceTweets() {
    if (questionlist.length < 15) {
        if (!geminiCalled){
            geminiCalled = true;
            callGemini({source: source});
        }
    }

    if (questionlist.length < 1) {
        return
    }

    const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]')).filter((tweet) => {
        const rect = tweet.getBoundingClientRect();
        return rect.top > window.innerHeight;
      });
    
      if (tweets.length === 0) {
        // Debug
        console.log('No tweets below viewport found');
        return;
      }

    if (Math.random() > 0.1) return;

    const randomIndex = Math.floor(Math.random() * tweets.length);
    const randomTweet = tweets[randomIndex];
    if (randomTweet.dataset.replaced) return;
    randomTweet.dataset.replaced = "true";

    const questionData = questionlist.pop()
    // Debug
    console.log("questions left: ", questionlist.length)

    const allAnswers = [...questionData.incorrect_answers, questionData.correct_answers].sort(
        () => Math.random() - 0.5
    );

    const replacementArticle = document.createElement("article");
    replacementArticle.style.width = "100%";
    replacementArticle.style.padding = "10px";
    replacementArticle.style.borderRadius = "8px";
    replacementArticle.style.backgroundColor = "black";
    replacementArticle.className = "css-175oi2r";

    const questionText = document.createElement("h3");
    questionText.textContent = questionData.question_text;
    questionText.style.marginBottom = "10px";
    questionText.style.fontFamily = "'Open Sans', sans-serif";
    replacementArticle.appendChild(questionText);

    const answersContainer = document.createElement("div");

    allAnswers.forEach((answer) => {
        const answerButton = document.createElement("button");
        answerButton.textContent = answer;
        answerButton.style.display = "block";
        answerButton.style.marginBottom = "5px";
        answerButton.style.padding = "10px";
        answerButton.style.border = "1px solid #ccc";
        answerButton.style.borderRadius = "5px";
        answerButton.style.cursor = "pointer";
        answerButton.style.textAlign = "left";
        answerButton.style.width = "100%";
        answerButton.style.fontFamily = "'Open Sans', sans-serif";



        answerButton.addEventListener("click", () => {
        answered += 1
        const buttons = answersContainer.querySelectorAll("button");
        buttons.forEach((btn) => {
            if (questionData.correct_answers.includes(btn.textContent)) {
            btn.style.backgroundColor = "rgba(0, 128, 0, 0.5)";
            btn.style.color = "white";
            if (btn === answerButton) {
                correct += 1; 
                // Debug
                console.log("Correct answers count:", correct);
              }
            } else {
            btn.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
            btn.style.color = "white";
            }
            btn.disabled = true;
        });

        explanation.style.display = "block";

        // Debug
        console.log(correct, " / ", answered)

        chrome.runtime.sendMessage({ 
            type: "UPDATE_ANSWER_STATS", 
            answer_stats: { correct, answered }
          }, (response) => {
            // Debug
            if (chrome.runtime.lastError) {
                console.error("Error sending message to background.js:", chrome.runtime.lastError.message);
              } else {
                console.log("Response from background.js:", response);
              }
          });

        });

        answersContainer.appendChild(answerButton);
    });

    replacementArticle.appendChild(answersContainer);

    const explanation = document.createElement("p");
    explanation.innerHTML = `<strong>Explanation:</strong> ${questionData.explanation}`;
    explanation.style.display = "none"; // Initially hidden
    explanation.style.padding = "10px";
    explanation.style.margin = "5px";
    explanation.style.fontFamily = "'Open Sans', sans-serif";
    replacementArticle.appendChild(explanation);
    randomTweet.replaceWith(replacementArticle);

    // Debug
    console.log('Tweet replaced successfully');
  }


// observes updates to the feed and replaces tweets when a change occurs
function observeFeed() {
    if (!On) {
        console.log("Feature is disabled. Stopping observer.");
        return;
      }

    const feed = document.querySelector('[role="main"]');
    if (!feed) {
    // Debug
      console.log('Feed not found');
      return;
    }
    
    stopFeedObserver();
    FeedObserver = new MutationObserver(() => {
        replaceTweets();
    });

    FeedObserver.observe(feed, {
      childList: true,
      subtree: true
    });
    // Debug
    console.log('Observer initialized');
  }

// Waits for feed to load and then sets up an observer
function waitForFeed() {
    const interval = setInterval(() => {
      const feed = document.querySelector('[role="main"]');
      if (feed) {
        clearInterval(interval);
        // Debug
        console.log('Feed found, starting observer');
        observeFeed();
      } else {
        // Debug
        console.log('Waiting for feed...');
      }
    }, 500);
  }
  
// waitForFeed();
  
  async function uploadFile(file) {
    const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
    const fileBlob = new Blob([file], { type: file.type });
    const fileSize = fileBlob.size;
  
    const headers = {
      "X-Goog-Upload-Command": "start, upload, finalize",
      "X-Goog-Upload-Header-Content-Length": fileSize.toString(),
      "X-Goog-Upload-Header-Content-Type": file.type,
      "X-Goog-Upload-Protocol": "raw",
      "Content-Type": file.type,
    };
  
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: fileBlob, // Send raw binary data
      });
  
      const rawResponse = await response.text();
      console.log("Raw upload response:", rawResponse);
  
      const data = JSON.parse(rawResponse);
      console.log("Parsed upload response:", data);
  
      if (!data.file || !data.file.uri) {
        throw new Error("Upload did not return a valid file URI.");
      }
  
      return data.file.uri; 
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }


  // Testing
  //const fileUrl = chrome.runtime.getURL("SWE_Sample_Study_Guide.pdf");
  //console.log(fileUrl);
  //fetch(fileUrl)
  //  .then((response) => response.blob())
  //  .then((blob) => {
  //    const file = new File([blob], "example.pdf", { type: "application/pdf" });
  //    callGemini({useFile: true, file: file});
  //    
  //  })
  //.catch((error) => console.error("Error loading file:", error));
  //callGemini({useFile: true});


  async function callGemini({ source = "subject" } = {}) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
  
    let subject = null;
  
    try {
      if (source == "file" && fileUri) {
        console.log("using file")
      } else if (source ==  "subject" || source == "subject+file") {
        console.log("Retrieving subject from storage...");
        subject = await new Promise((resolve) => {
          chrome.storage.local.get({ subject: null }, (result) => {
            const retrievedSubject = result.subject || "random trivia questions";
            console.log("Subject retrieved:", retrievedSubject);
            resolve(retrievedSubject);
          });
        });
      }
  
      const requestBody = {
        contents: [],
        generationConfig: {
          temperature: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            description: "List of questions with their answers and explanations",
            items: {
              type: "object",
              description: "Question and answer data",
              properties: {
                question_text: {
                  type: "string",
                  description: "The text of the question",
                  nullable: false,
                },
                correct_answers: {
                  type: "array",
                  description: "List of correct answers",
                  nullable: false,
                  items: {
                    type: "string",
                  },
                },
                incorrect_answers: {
                  type: "array",
                  description: "List of incorrect answers",
                  nullable: false,
                  items: {
                    type: "string",
                  },
                },
                topic: {
                  type: "string",
                  description: "The specific topic covered by the question",
                  nullable: false,
                },
                explanation: {
                  type: "string",
                  description: "Explanation of the correct answer",
                  nullable: false,
                },
              },
              required: [
                "question_text",
                "correct_answers",
                "incorrect_answers",
                "topic",
                "explanation",
              ],
            },
          },
        },
      };
  
      if (fileUri && source == "file") {
        requestBody.contents.push({
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: fileUri,
                mimeType: mimeType,
              },
            },
          ],
        });
  
        requestBody.contents.push({
          role: "user",
          parts: [
            {
              text: `Give me a list of 20 graduate-level questions based on the provided file. Make sure the full response is included and not just the letter. Do not use keywords from the question in the correct answer. The correct answer should not always be the longest answer. Ensure there always is a correct answer.`,
            },
          ],
        });
      } else if (subject && source == "subject") {
        requestBody.contents.push({
          role: "user",
          parts: [
            {
              text: `Give me a list of 20 graduate-level questions with the subject: ${subject}. Make sure the full response is included and not just the letter. Do not use keywords from the question in the correct answer. The correct answer should not always be the longest answer. Ensure there always is a correct answer.`,
            },
          ],
        });
      } else if (subject && fileUri && source == "subject+file") {
        requestBody.contents.push({
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: fileUri,
                mimeType: mimeType,
              },
            },
          ],
        });
  
        requestBody.contents.push({
          role: "user",
          parts: [
            {
              text: `Give me a list of 20 graduate-level questions based on the provided file and the following subject: ${subject}. Make sure the full response is included and not just the letter. Do not use keywords from the question in the correct answer. The correct answer should not always be the longest answer. Ensure there always is a correct answer.`,
            },
          ],
        });
      }
  
      // Log request body for debugging
      console.log("Request body:", JSON.stringify(requestBody, null, 2));
  
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        const errorDetails = await response.json();
        console.error("Error details:", errorDetails);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("Generated Response:", data);
  
      // Process response
      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]
      ) {
        const jsonString = data.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(jsonString);
        console.log("Parsed JSON Object:", parsedData);
        questionlist = [...questionlist, ...Object.values(parsedData)];
        console.log("Updated question list:", questionlist);
        geminiCalled = false;
      } else {
        console.error("Response does not contain the expected structure.");
        geminiCalled = false;
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      geminiCalled = false;
    }
  }