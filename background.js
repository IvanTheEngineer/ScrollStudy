// Background Script Version 2.1 - Updated for QA Analysis - FORCE RELOAD
let answerStats = { correct: 0, answered: 0 };
let On = false;

console.log("Background script loaded - Version 2.1 - QA Analysis Enabled");
console.log("Available message types: UPDATE_ANSWER_STATS, RESET_ANSWER_STATS, TOGGLE_ON, SAVE_SUBJECT, SAVE_KEY, NEW_FILE, DELETE_KEY, SAVE_SOURCE, SAVE_QUESTION_ANSWER, GET_QA_HISTORY, CLEAR_QA_HISTORY, GENERATE_LLM_ANALYSIS");

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
        return true;
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
    } else if (message.type === "SAVE_QUESTION_ANSWER") {
        // Store question/answer data for analysis
        console.log("Processing SAVE_QUESTION_ANSWER message");
        const qaData = message.qaData;
        chrome.storage.local.get({ qaHistory: [] }, (result) => {
            const qaHistory = result.qaHistory;
            qaHistory.push({
                ...qaData,
                timestamp: Date.now(),
                id: Date.now() + Math.random() // Unique ID
            });
            
            // Keep only last 100 questions to prevent storage bloat
            if (qaHistory.length > 100) {
                qaHistory.splice(0, qaHistory.length - 100);
            }
            
            chrome.storage.local.set({ qaHistory: qaHistory }, () => {
                console.log("Question/Answer data saved:", qaData);
                sendResponse({ message: "Question/Answer data saved successfully!" });
            });
        });
        return true;
    } else if (message.type === "GET_QA_HISTORY") {
        // Retrieve question/answer history for analysis
        console.log("Processing GET_QA_HISTORY message");
        chrome.storage.local.get({ qaHistory: [] }, (result) => {
            console.log("Retrieved QA history:", result.qaHistory);
            sendResponse({ qaHistory: result.qaHistory });
        });
        return true;
    } else if (message.type === "CLEAR_QA_HISTORY") {
        // Clear all question/answer data
        console.log("Processing CLEAR_QA_HISTORY message");
        chrome.storage.local.remove('qaHistory', () => {
            console.log("Question/Answer history cleared");
            sendResponse({ message: "Question/Answer history cleared successfully!" });
        });
        return true;
    } else if (message.type === "GENERATE_LLM_ANALYSIS") {
        // Generate LLM-based analysis report
        console.log("Processing GENERATE_LLM_ANALYSIS message");
        const qaHistory = message.qaHistory;
        const apiKey = message.apiKey;
        
        generateLLMAnalysis(qaHistory, apiKey)
            .then(analysis => {
                sendResponse({ success: true, analysis: analysis });
            })
            .catch(error => {
                console.error("Error generating LLM analysis:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else {
        console.warn("Unknown message type received:", message.type);
        sendResponse({ error: "Unknown message type" });
    }
});

// LLM Analysis Generation Function
async function generateLLMAnalysis(qaHistory, apiKey) {
    if (!qaHistory || qaHistory.length === 0) {
        throw new Error("No question/answer data available for analysis");
    }

    // Prepare data for LLM analysis
    const analysisData = {
        totalQuestions: qaHistory.length,
        correctAnswers: qaHistory.filter(qa => qa.isCorrect).length,
        accuracyRate: ((qaHistory.filter(qa => qa.isCorrect).length / qaHistory.length) * 100).toFixed(1),
        topics: {},
        recentPerformance: qaHistory.slice(-10).map(qa => ({
            correct: qa.isCorrect,
            topic: qa.topic || 'General',
            difficulty: qa.difficulty || 'Unknown'
        }))
    };

    // Analyze topics
    qaHistory.forEach(qa => {
        const topic = qa.topic || 'General';
        if (!analysisData.topics[topic]) {
            analysisData.topics[topic] = { total: 0, correct: 0, questions: [] };
        }
        analysisData.topics[topic].total++;
        if (qa.isCorrect) {
            analysisData.topics[topic].correct++;
        }
        analysisData.topics[topic].questions.push({
            question: qa.question,
            userAnswer: qa.userAnswer,
            correctAnswer: qa.answer,
            isCorrect: qa.isCorrect,
            difficulty: qa.difficulty
        });
    });

    // Create prompt for LLM
    const prompt = `You are an educational analysis expert. Analyze the following student performance data and provide a comprehensive study analysis report.

STUDENT PERFORMANCE DATA:
- Total Questions: ${analysisData.totalQuestions}
- Correct Answers: ${analysisData.correctAnswers}
- Overall Accuracy: ${analysisData.accuracyRate}%

TOPIC BREAKDOWN:
${Object.entries(analysisData.topics).map(([topic, data]) => 
    `- ${topic}: ${data.correct}/${data.total} correct (${((data.correct/data.total)*100).toFixed(1)}%)`
).join('\n')}

RECENT PERFORMANCE (Last 10 questions):
${analysisData.recentPerformance.map((perf, index) => 
    `${index + 1}. ${perf.topic} (${perf.difficulty}) - ${perf.correct ? 'Correct' : 'Incorrect'}`
).join('\n')}

Please provide a comprehensive analysis report in the following JSON format:
{
  "overallAssessment": "Brief overall performance assessment",
  "strongAreas": [
    {
      "topic": "Topic name",
      "strength": "Why this is a strength",
      "accuracy": "Accuracy percentage",
      "recommendation": "How to maintain this strength"
    }
  ],
  "weakAreas": [
    {
      "topic": "Topic name", 
      "weakness": "Why this is a weakness",
      "accuracy": "Accuracy percentage",
      "recommendation": "Specific study recommendations"
    }
  ],
  "studyRecommendations": [
    "Specific actionable study recommendations"
  ],
  "performanceInsights": [
    "Key insights about the student's learning patterns"
  ],
  "nextSteps": [
    "Concrete next steps for improvement"
  ]
}

Focus on providing actionable, specific advice that will help the student improve their learning outcomes.`;

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
                responseMimeType: "application/json"
            }
        })
    });

    if (!response.ok) {
        throw new Error(`LLM API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from LLM API');
    }

    const analysisText = data.candidates[0].content.parts[0].text;
    
    try {
        const analysis = JSON.parse(analysisText);
        return {
            ...analysis,
            generatedAt: new Date().toISOString(),
            dataSummary: analysisData
        };
    } catch (parseError) {
        // If JSON parsing fails, return a structured response with the raw text
        return {
            overallAssessment: "Analysis completed",
            strongAreas: [],
            weakAreas: [],
            studyRecommendations: [analysisText],
            performanceInsights: [],
            nextSteps: [],
            generatedAt: new Date().toISOString(),
            dataSummary: analysisData,
            rawAnalysis: analysisText
        };
    }
}