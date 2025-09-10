let apiKey = null;
// Event listener that waits for the extension popup to load
document.addEventListener("DOMContentLoaded", () => {
    // Add initial animations
    document.querySelector('.popup-container').classList.add('fade-in-up');

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

    // Ensure all status containers start hidden
    validating.style.display = "none";
    validKey.style.display = "none";
    invalidKey.style.display = "none";

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
            // No API key - ensure all status containers are hidden
            validating.style.display = "none";
            validKey.style.display = "none";
            invalidKey.style.display = "none";
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
          fileInfo.innerHTML = `<i class="fas fa-file"></i> ${fileName}`;
          fileInfo.classList.add('show');
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
        fileInfo.innerHTML = `<i class="fas fa-file"></i> ${file.name}`;
        fileInfo.classList.add('show');
  
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
        saveButton.classList.add('btn-success');
        saveButton.style.transform = "scale(0.95)";

        setTimeout(() => {
            saveButton.classList.remove('btn-success');
            saveButton.style.transform = "";
        }, 600);

        chrome.runtime.sendMessage(
        { type: "SAVE_SUBJECT", text },
        (response) => {
            console.log(response.message);
        }
        );
    });

    saveKeyButton.addEventListener("click", () => {
        const key = keyInput.value;
        saveKeyButton.classList.add('btn-success');
        saveKeyButton.style.transform = "scale(0.95)";
        keyInput.value = "";

        setTimeout(() => {
            saveKeyButton.classList.remove('btn-success');
            saveKeyButton.style.transform = "";
        }, 600);

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

    const deleteKeyButtons = document.querySelectorAll('.btn-delete');

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
        resetButton.classList.add('bounce');
        resetButton.style.transform = "scale(0.95)";
        
        setTimeout(() => {
            resetButton.classList.remove('bounce');
            resetButton.style.transform = "";
        }, 1000);

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

    // Analysis functionality
    const generateAnalysisBtn = document.getElementById("generate-analysis");
    const clearAnalysisBtn = document.getElementById("clear-analysis-data");
    const addSampleDataBtn = document.getElementById("add-sample-data");
    const toggleReportBtn = document.getElementById("toggle-report");
    const analysisReport = document.getElementById("analysis-report");
    const reportContent = document.getElementById("report-content");

    generateAnalysisBtn.addEventListener("click", () => {
        generateAnalysisBtn.classList.add('btn-success');
        generateAnalysisBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        
        // First get the QA history
        chrome.runtime.sendMessage({ type: "GET_QA_HISTORY" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting QA history:", chrome.runtime.lastError.message);
                generateAnalysisBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Generate Analysis Report';
                generateAnalysisBtn.classList.remove('btn-success');
                return;
            }
            
            const qaHistory = response.qaHistory;
            
            if (!qaHistory || qaHistory.length === 0) {
                showNoDataMessage();
                generateAnalysisBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Generate Analysis Report';
                generateAnalysisBtn.classList.remove('btn-success');
                return;
            }
            
            // Get the API key for LLM analysis
            chrome.storage.local.get({ key: null }, (keyResult) => {
                if (!keyResult.key) {
                    alert("Please configure your Gemini API key first to generate LLM analysis reports.");
                    generateAnalysisBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Generate Analysis Report';
                    generateAnalysisBtn.classList.remove('btn-success');
                    return;
                }
                
                // Generate LLM analysis
                chrome.runtime.sendMessage({ 
                    type: "GENERATE_LLM_ANALYSIS", 
                    qaHistory: qaHistory,
                    apiKey: keyResult.key
                }, (llmResponse) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error generating LLM analysis:", chrome.runtime.lastError.message);
                        // Fallback to local analysis
                        generateAnalysisReport(qaHistory);
                    } else if (llmResponse.success) {
                        displayLLMAnalysisReport(llmResponse.analysis);
                    } else {
                        console.error("LLM analysis failed:", llmResponse.error);
                        // Fallback to local analysis
                        generateAnalysisReport(qaHistory);
                    }
                    
                    generateAnalysisBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Generate Analysis Report';
                    generateAnalysisBtn.classList.remove('btn-success');
                });
            });
        });
    });

    clearAnalysisBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all question/answer data? This action cannot be undone.")) {
            clearAnalysisBtn.classList.add('btn-success');
            clearAnalysisBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
            
            chrome.runtime.sendMessage({ type: "CLEAR_QA_HISTORY" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error clearing QA history:", chrome.runtime.lastError.message);
                } else {
                    console.log("QA history cleared successfully");
                    analysisReport.style.display = "none";
                }
                
                clearAnalysisBtn.innerHTML = '<i class="fas fa-trash"></i> Clear Data';
                clearAnalysisBtn.classList.remove('btn-success');
            });
        }
    });

    addSampleDataBtn.addEventListener("click", () => {
        addSampleDataBtn.classList.add('btn-success');
        addSampleDataBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        
        // Add sample data for demonstration
        const sampleQuestions = [
            {
                question: "What is the capital of France?",
                answer: "Paris",
                userAnswer: "Paris",
                isCorrect: true,
                topic: "Geography",
                subject: "World Geography",
                difficulty: "Easy",
                timeSpent: 15000,
                source: "Study Guide"
            },
            {
                question: "What is 2 + 2?",
                answer: "4",
                userAnswer: "4",
                isCorrect: true,
                topic: "Mathematics",
                subject: "Basic Math",
                difficulty: "Easy",
                timeSpent: 5000,
                source: "Practice Test"
            },
            {
                question: "What is the chemical symbol for water?",
                answer: "H2O",
                userAnswer: "H2O",
                isCorrect: true,
                topic: "Chemistry",
                subject: "Chemical Formulas",
                difficulty: "Medium",
                timeSpent: 25000,
                source: "Chemistry Textbook"
            },
            {
                question: "Who wrote 'Romeo and Juliet'?",
                answer: "William Shakespeare",
                userAnswer: "Shakespeare",
                isCorrect: true,
                topic: "Literature",
                subject: "English Literature",
                difficulty: "Medium",
                timeSpent: 20000,
                source: "Literature Study"
            },
            {
                question: "What is the largest planet in our solar system?",
                answer: "Jupiter",
                userAnswer: "Saturn",
                isCorrect: false,
                topic: "Astronomy",
                subject: "Solar System",
                difficulty: "Easy",
                timeSpent: 30000,
                source: "Science Quiz"
            },
            {
                question: "What is the derivative of x²?",
                answer: "2x",
                userAnswer: "2x",
                isCorrect: true,
                topic: "Mathematics",
                subject: "Calculus",
                difficulty: "Hard",
                timeSpent: 45000,
                source: "Math Practice"
            },
            {
                question: "What is photosynthesis?",
                answer: "Process by which plants convert light into energy",
                userAnswer: "Process by which plants convert light into energy",
                isCorrect: true,
                topic: "Biology",
                subject: "Plant Biology",
                difficulty: "Medium",
                timeSpent: 35000,
                source: "Biology Textbook"
            },
            {
                question: "What year did World War II end?",
                answer: "1945",
                userAnswer: "1944",
                isCorrect: false,
                topic: "History",
                subject: "World War II",
                difficulty: "Medium",
                timeSpent: 40000,
                source: "History Quiz"
            }
        ];

        let completed = 0;
        sampleQuestions.forEach((question, index) => {
            setTimeout(() => {
                saveQuestionAnswer(question);
                completed++;
                if (completed === sampleQuestions.length) {
                    addSampleDataBtn.innerHTML = '<i class="fas fa-check"></i> Sample Data Added!';
                    setTimeout(() => {
                        addSampleDataBtn.innerHTML = '<i class="fas fa-plus"></i> Add Sample Data';
                        addSampleDataBtn.classList.remove('btn-success');
                    }, 2000);
                }
            }, index * 100); // Stagger the saves
        });
    });

    // Toggle report functionality
    if (toggleReportBtn && reportContent) {
        toggleReportBtn.addEventListener("click", () => {
            const isCollapsed = reportContent.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expand
                reportContent.style.maxHeight = reportContent.scrollHeight + 'px';
                reportContent.classList.remove('collapsed');
                toggleReportBtn.classList.remove('collapsed');
                toggleReportBtn.innerHTML = '<i class="fas fa-chevron-up"></i><span class="toggle-text">Collapse</span>';
                
                // Remove the maxHeight after transition completes
                setTimeout(() => {
                    reportContent.style.maxHeight = 'none';
                }, 300);
            } else {
                // Collapse
                reportContent.style.maxHeight = reportContent.scrollHeight + 'px';
                // Force reflow
                reportContent.offsetHeight;
                reportContent.style.maxHeight = '0px';
                reportContent.classList.add('collapsed');
                toggleReportBtn.classList.add('collapsed');
                toggleReportBtn.innerHTML = '<i class="fas fa-chevron-down"></i><span class="toggle-text">Expand</span>';
            }
        });
    }

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

// Analysis Report Generation Function
function generateAnalysisReport(qaHistory) {
    if (!qaHistory || qaHistory.length === 0) {
        showNoDataMessage();
        return;
    }

    const analysis = analyzeQAHistory(qaHistory);
    displayAnalysisReport(analysis);
}

function analyzeQAHistory(qaHistory) {
    const totalQuestions = qaHistory.length;
    const correctAnswers = qaHistory.filter(qa => qa.isCorrect).length;
    const accuracyRate = totalQuestions > 0 ? (correctAnswers / totalQuestions * 100).toFixed(1) : 0;

    // Analyze topics/subjects
    const topicStats = {};
    qaHistory.forEach(qa => {
        const topic = qa.topic || qa.subject || 'General';
        if (!topicStats[topic]) {
            topicStats[topic] = { total: 0, correct: 0 };
        }
        topicStats[topic].total++;
        if (qa.isCorrect) {
            topicStats[topic].correct++;
        }
    });

    // Calculate accuracy for each topic
    const topicAccuracies = Object.entries(topicStats).map(([topic, stats]) => ({
        topic,
        accuracy: (stats.correct / stats.total * 100).toFixed(1),
        total: stats.total,
        correct: stats.correct
    }));

    // Sort topics by accuracy
    topicAccuracies.sort((a, b) => parseFloat(b.accuracy) - parseFloat(a.accuracy));

    // Identify strong and weak areas
    const strongAreas = topicAccuracies.filter(topic => parseFloat(topic.accuracy) >= 80 && topic.total >= 3);
    const weakAreas = topicAccuracies.filter(topic => parseFloat(topic.accuracy) < 60 && topic.total >= 2);

    // Generate recommendations
    const recommendations = generateRecommendations(topicAccuracies, strongAreas, weakAreas);

    // Analyze recent performance trend
    const recentPerformance = analyzeRecentPerformance(qaHistory);

    return {
        totalQuestions,
        correctAnswers,
        accuracyRate,
        strongAreas,
        weakAreas,
        recommendations,
        recentPerformance,
        topicAccuracies
    };
}

function generateRecommendations(topicAccuracies, strongAreas, weakAreas) {
    const recommendations = [];

    if (weakAreas.length > 0) {
        recommendations.push({
            type: 'focus',
            text: `Focus on ${weakAreas.slice(0, 3).map(w => w.topic).join(', ')} - these areas need improvement`,
            priority: 'high'
        });
    }

    if (strongAreas.length > 0) {
        recommendations.push({
            type: 'maintain',
            text: `Keep practicing ${strongAreas.slice(0, 2).map(s => s.topic).join(', ')} to maintain your strengths`,
            priority: 'medium'
        });
    }

    // General recommendations based on overall performance
    const avgAccuracy = topicAccuracies.reduce((sum, topic) => sum + parseFloat(topic.accuracy), 0) / topicAccuracies.length;
    
    if (avgAccuracy < 70) {
        recommendations.push({
            type: 'general',
            text: 'Consider reviewing fundamental concepts before tackling advanced topics',
            priority: 'high'
        });
    } else if (avgAccuracy > 85) {
        recommendations.push({
            type: 'general',
            text: 'Great job! Try challenging yourself with more difficult questions',
            priority: 'low'
        });
    }

    if (topicAccuracies.length < 5) {
        recommendations.push({
            type: 'general',
            text: 'Explore more diverse topics to get a comprehensive analysis',
            priority: 'medium'
        });
    }

    return recommendations;
}

function analyzeRecentPerformance(qaHistory) {
    // Get last 10 questions for trend analysis
    const recent = qaHistory.slice(-10);
    return recent.map(qa => ({
        correct: qa.isCorrect,
        timestamp: qa.timestamp
    }));
}

function displayAnalysisReport(analysis) {
    const report = document.getElementById('analysis-report');
    
    // Update report date
    document.getElementById('report-date').textContent = new Date().toLocaleDateString();
    
    // Update performance metrics
    document.getElementById('total-questions').textContent = analysis.totalQuestions;
    document.getElementById('correct-answers').textContent = analysis.correctAnswers;
    document.getElementById('accuracy-rate').textContent = analysis.accuracyRate + '%';
    
    // Display strong areas
    const strongAreasContainer = document.getElementById('strong-areas');
    if (analysis.strongAreas.length > 0) {
        strongAreasContainer.innerHTML = analysis.strongAreas.map(area => 
            `<div class="area-item strong">
                <i class="fas fa-star"></i>
                <span class="area-text">${area.topic}</span>
                <span class="area-score">${area.accuracy}% (${area.correct}/${area.total})</span>
            </div>`
        ).join('');
    } else {
        strongAreasContainer.innerHTML = '<p class="no-data">No strong areas identified yet</p>';
    }
    
    // Display weak areas
    const weakAreasContainer = document.getElementById('weak-areas');
    if (analysis.weakAreas.length > 0) {
        weakAreasContainer.innerHTML = analysis.weakAreas.map(area => 
            `<div class="area-item weak">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="area-text">${area.topic}</span>
                <span class="area-score">${area.accuracy}% (${area.correct}/${area.total})</span>
            </div>`
        ).join('');
    } else {
        weakAreasContainer.innerHTML = '<p class="no-data">No weak areas identified yet</p>';
    }
    
    // Display recommendations
    const recommendationsContainer = document.getElementById('study-recommendations');
    if (analysis.recommendations.length > 0) {
        recommendationsContainer.innerHTML = analysis.recommendations.map(rec => 
            `<div class="recommendation-item">
                <i class="fas fa-lightbulb"></i>
                <span class="recommendation-text">${rec.text}</span>
            </div>`
        ).join('');
    } else {
        recommendationsContainer.innerHTML = '<p class="no-data">Complete more questions to get personalized recommendations</p>';
    }
    
    // Display performance trend
    const trendContainer = document.getElementById('performance-trend');
    if (analysis.recentPerformance.length >= 5) {
        const trendBars = analysis.recentPerformance.map(perf => 
            `<div class="trend-bar-item ${perf.correct ? 'correct' : 'incorrect'}" 
                 style="height: ${perf.correct ? '60px' : '20px'}" 
                 title="${perf.correct ? 'Correct' : 'Incorrect'} - ${new Date(perf.timestamp).toLocaleDateString()}">
            </div>`
        ).join('');
        
        trendContainer.innerHTML = `<div class="trend-bar">${trendBars}</div>`;
    } else {
        trendContainer.innerHTML = '<p class="no-data">Not enough data for trend analysis</p>';
    }
    
    // Show the report
    report.style.display = 'block';
    report.classList.add('fade-in-up');
}

function showNoDataMessage() {
    const report = document.getElementById('analysis-report');
    report.innerHTML = `
        <div class="report-header">
            <h4 class="report-title">
                <i class="fas fa-file-alt"></i>
                No Data Available
            </h4>
        </div>
        <div class="report-section">
            <p class="no-data">You need to answer some questions first to generate an analysis report.</p>
            <p class="no-data">Start studying and come back to see your progress!</p>
        </div>
    `;
    report.style.display = 'block';
    report.classList.add('fade-in-up');
}

// Display LLM-generated analysis report
function displayLLMAnalysisReport(analysis) {
    const report = document.getElementById('analysis-report');
    const reportContent = document.getElementById('report-content');
    
    if (!report || !reportContent) {
        console.error('Analysis report elements not found');
        return;
    }
    
    // Update report date
    const reportDate = document.getElementById('report-date');
    if (reportDate) {
        reportDate.textContent = new Date().toLocaleDateString();
    }
    
    // Update performance metrics from data summary
    if (analysis.dataSummary) {
        const totalQuestions = document.getElementById('total-questions');
        const correctAnswers = document.getElementById('correct-answers');
        const accuracyRate = document.getElementById('accuracy-rate');
        
        if (totalQuestions) totalQuestions.textContent = analysis.dataSummary.totalQuestions;
        if (correctAnswers) correctAnswers.textContent = analysis.dataSummary.correctAnswers;
        if (accuracyRate) accuracyRate.textContent = analysis.dataSummary.accuracyRate + '%';
    }
    
    // Display overall assessment
    const overallAssessment = analysis.overallAssessment || "Analysis completed";
    
    // Display strong areas
    const strongAreasContainer = document.getElementById('strong-areas');
    if (strongAreasContainer) {
        if (analysis.strongAreas && analysis.strongAreas.length > 0) {
            strongAreasContainer.innerHTML = analysis.strongAreas.map(area => 
                `<div class="area-item strong">
                    <i class="fas fa-star"></i>
                    <div class="area-content">
                        <span class="area-text">${area.topic}</span>
                        <span class="area-description">${area.strength}</span>
                        <span class="area-score">${area.accuracy}% accuracy</span>
                    </div>
                </div>`
            ).join('');
        } else {
            strongAreasContainer.innerHTML = '<p class="no-data">No strong areas identified yet</p>';
        }
    }
    
    // Display weak areas
    const weakAreasContainer = document.getElementById('weak-areas');
    if (weakAreasContainer) {
        if (analysis.weakAreas && analysis.weakAreas.length > 0) {
            weakAreasContainer.innerHTML = analysis.weakAreas.map(area => 
                `<div class="area-item weak">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="area-content">
                        <span class="area-text">${area.topic}</span>
                        <span class="area-description">${area.weakness}</span>
                        <span class="area-score">${area.accuracy}% accuracy</span>
                    </div>
                </div>`
            ).join('');
        } else {
            weakAreasContainer.innerHTML = '<p class="no-data">No weak areas identified yet</p>';
        }
    }
    
    // Display recommendations
    const recommendationsContainer = document.getElementById('study-recommendations');
    if (recommendationsContainer) {
        if (analysis.studyRecommendations && analysis.studyRecommendations.length > 0) {
            recommendationsContainer.innerHTML = analysis.studyRecommendations.map(rec => 
                `<div class="recommendation-item">
                    <i class="fas fa-lightbulb"></i>
                    <span class="recommendation-text">${rec}</span>
                </div>`
            ).join('');
        } else {
            recommendationsContainer.innerHTML = '<p class="no-data">No specific recommendations available</p>';
        }
    }
    
    // Display performance insights and next steps
    let additionalContent = '';
    
    if (analysis.performanceInsights && analysis.performanceInsights.length > 0) {
        additionalContent += `
            <div class="report-section">
                <h5 class="report-section-title">
                    <i class="fas fa-chart-line"></i>
                    Performance Insights
                </h5>
                <div class="insights-list">
                    ${analysis.performanceInsights.map(insight => 
                        `<div class="insight-item">
                            <i class="fas fa-eye"></i>
                            <span class="insight-text">${insight}</span>
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    if (analysis.nextSteps && analysis.nextSteps.length > 0) {
        additionalContent += `
            <div class="report-section">
                <h5 class="report-section-title">
                    <i class="fas fa-arrow-right"></i>
                    Next Steps
                </h5>
                <div class="next-steps-list">
                    ${analysis.nextSteps.map(step => 
                        `<div class="next-step-item">
                            <i class="fas fa-check-circle"></i>
                            <span class="next-step-text">${step}</span>
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    // Add overall assessment at the top
    const assessmentContent = `
        <div class="report-section">
            <h5 class="report-section-title">
                <i class="fas fa-clipboard-check"></i>
                Overall Assessment
            </h5>
            <div class="assessment-content">
                <p class="assessment-text">${overallAssessment}</p>
            </div>
        </div>
    `;
    
    // Insert the additional content before the performance trend section
    const performanceTrendElement = reportContent.querySelector('#performance-trend');
    if (performanceTrendElement && performanceTrendElement.parentElement) {
        performanceTrendElement.parentElement.insertAdjacentHTML('beforebegin', assessmentContent + additionalContent);
    }
    
    // Hide the performance trend section for LLM analysis (we'll show it separately if needed)
    const trendContainer = document.getElementById('performance-trend');
    if (trendContainer) {
        trendContainer.innerHTML = '<p class="no-data">Performance trend analysis available in detailed report</p>';
    }
    
    // Show the report
    report.style.display = 'block';
    report.classList.add('fade-in-up');
}

// Function to save question/answer data (to be called from content script)
function saveQuestionAnswer(questionData) {
    chrome.runtime.sendMessage({
        type: "SAVE_QUESTION_ANSWER",
        qaData: questionData
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error saving question/answer data:", chrome.runtime.lastError.message);
        } else {
            console.log("Question/Answer data saved successfully");
        }
    });
}

// Sample function to demonstrate how to save QA data
// This would typically be called from your content script when a user answers a question
function sampleSaveQA() {
    const sampleData = {
        question: "What is the capital of France?",
        answer: "Paris",
        userAnswer: "Paris",
        isCorrect: true,
        topic: "Geography",
        subject: "World Geography",
        difficulty: "Easy",
        timeSpent: 15000, // milliseconds
        source: "Study Guide"
    };
    
    saveQuestionAnswer(sampleData);
}