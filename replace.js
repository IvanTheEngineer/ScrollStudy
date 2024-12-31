let questionlist = [];
let geminiCalled = false;
let answered = 0;
let correct = 0;
let On = false;
let FeedObserver = null;

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
  }
});

// Replaces occasional tweets with questions
function replaceTweets() {
    if (questionlist.length < 15) {
        if (!geminiCalled){
            geminiCalled = true;
            callGemini();
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
    replacementArticle.style.border = "1px solid #ccc";
    replacementArticle.style.borderRadius = "8px";
    replacementArticle.style.backgroundColor = "black";

    const questionText = document.createElement("h3");
    questionText.textContent = questionData.question_text;
    questionText.style.marginBottom = "10px";
    replacementArticle.appendChild(questionText);

    const answersContainer = document.createElement("div");
    answersContainer.style.marginBottom = "10px";

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


        answerButton.addEventListener("click", () => {
        answered += 1
        const buttons = answersContainer.querySelectorAll("button");
        buttons.forEach((btn) => {
            if (questionData.correct_answers.includes(btn.textContent)) {
            btn.style.backgroundColor = "green";
            btn.style.color = "white";
            if (btn === answerButton) {
                correct += 1; 
                // Debug
                console.log("Correct answers count:", correct);
              }
            } else {
            btn.style.backgroundColor = "red";
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
    explanation.textContent = questionData.explanation;
    explanation.style.display = "none"; // Initially hidden
    explanation.style.marginTop = "10px";
    explanation.style.padding = "10px";
    explanation.style.border = "1px solid #ccc";
    explanation.style.borderRadius = "5px";
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

// API call to gemii to top-up the question bank
async function callGemini() {
    const apiKey = "REDACTED";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const subject = await new Promise((resolve) => {
        chrome.storage.local.get({ subject: null }, (result) => {
          const retrievedSubject = result.subject || "random trivia questions";
          console.log("Subject retrieved:", retrievedSubject);
          resolve(retrievedSubject);
        });
      });
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Give me a list of 20 graduate level questions with the subject: ${subject}. Make sure the full response is included and not just the letter. 
              Do not keywords from the question in the correct answer. The correct answer should not always be the longest answer. Ensure there always is a correct answer.`
            }
          ]
        }
      ],
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
                nullable: false
              },
              correct_answers: {
                type: "array",
                description: "List of correct answers",
                nullable: false,
                items: {
                  type: "string"
                }
              },
              incorrect_answers: {
                type: "array",
                description: "List of incorrect answers",
                nullable: false,
                items: {
                  type: "string"
                }
              },
              topic: {
                type: "string",
                description: "The specific topic covered by the question",
                nullable: false
              },
              explanation: {
                type: "string",
                description: "Explanation of the correct answer",
                nullable: false
              }
            },
            required: [
              "question_text",
              "correct_answers",
              "incorrect_answers",
              "topic",
              "explanation"
            ]
          }
        }
      }
    };
  
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
  
      if (!response.ok) {
        const errorDetails = await response.json();
        console.error("Error details:", errorDetails);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      // Debug
      console.log("Generated Response:", data);
  
      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]
      ) {
        const jsonString = data.candidates[0].content.parts[0].text;

        const parsedData = JSON.parse(jsonString);
        // Debug
        console.log("Parsed JSON Object:", parsedData);
        questionlist = [...questionlist, ...Object.values(parsedData)];
        // Debug
        console.log(questionlist)
        geminiCalled = false
      } else {
        console.error("Response does not contain the expected structure.");
        geminiCalled = false
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      geminiCalled = false
    }
  }
  