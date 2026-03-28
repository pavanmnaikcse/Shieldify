document.addEventListener("DOMContentLoaded", () => {
    // Load API Key on start if present
    const savedKey = localStorage.getItem("cyberApiKey");
    if (savedKey) {
        document.getElementById("apiKey").value = savedKey;
    }

    // Make popups draggable
    setupDraggable();

    // Close on clicking outside popup-box
    document.addEventListener("mousedown", (e) => {
        const popups = document.querySelectorAll(".popup.cyber-active");
        if (popups.length === 0) return;
        
        let clickedInsideBox = false;
        let clickedButton = !!e.target.closest('button');

        popups.forEach(p => {
            const box = p.querySelector(".popup-box");
            if (box && box.contains(e.target)) {
                clickedInsideBox = true;
            }
        });

        // If clicking outside any open popup box and not clicking a button that might open it
        if (!clickedInsideBox && !clickedButton) {
            popups.forEach(p => closePopup(p.id));
        }
    });
});

let zIndexCounter = 1000;

function openPopup(id) {
    const popup = document.getElementById(id);
    if (!popup) return;
    
    popup.classList.add("cyber-active");
    const box = popup.querySelector(".popup-box");
    if (box) {
        box.classList.add("cyber-box");
        // Center it roughly if no inline position is set
        if (!box.style.left) {
            box.style.left = Math.max(0, (window.innerWidth / 2 - 200)) + "px";
            box.style.top = Math.max(0, (window.innerHeight / 2 - 200)) + "px";
        }
    }
    popup.style.display = "block";
    popup.style.zIndex = ++zIndexCounter;
}

function closePopup(id) {
    const popup = document.getElementById(id);
    if (popup) {
        popup.style.display = "none";
        popup.classList.remove("cyber-active");
    }
}

function saveAPI() {
    const key = document.getElementById("apiKey").value.trim();
    if (key) {
        localStorage.setItem("cyberApiKey", key);
        alert("API Key saved securely to LocalStorage!");
        closePopup("settingsPopup");
    } else {
        alert("Please enter a valid API Key.");
    }
}

async function testAPI() {
    const key = document.getElementById("apiKey").value.trim();
    const resultDiv = document.getElementById("apiTestResult");
    if (!key) {
        resultDiv.style.display = "block";
        resultDiv.innerHTML = "❌ Please enter an API Key first";
        return;
    }
    
    resultDiv.style.display = "block";
    resultDiv.innerHTML = "Testing connection...";
    resultDiv.style.color = "#fff";
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Ping" }] }]
            })
        });
        
        if (response.ok) {
            resultDiv.innerHTML = "✅ API Key is valid";
            resultDiv.style.color = "#38ef7d";
        } else {
            resultDiv.innerHTML = "❌ Invalid API Key";
            resultDiv.style.color = "#ff4b2b";
        }
    } catch (e) {
        resultDiv.innerHTML = "❌ Connection Failed";
        resultDiv.style.color = "#ff4b2b";
    }
}

// Draggable logic for all modern floating windows
function setupDraggable() {
    const boxes = document.querySelectorAll(".popup-box");
    boxes.forEach(box => {
        let isDragging = false;
        let offsetX, offsetY;

        box.addEventListener("mousedown", (e) => {
            // Don't intercept drag if clicking input, textarea, or button
            if (["INPUT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)) return;
            
            isDragging = true;
            box.parentElement.style.zIndex = ++zIndexCounter;
            
            const rect = box.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            box.style.transition = "none"; 
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            box.style.left = (e.clientX - offsetX) + "px";
            box.style.top = (e.clientY - offsetY) + "px";
            box.style.transform = "none"; 
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
        });
    });
}

// ========================
// AI Analysers Integration
// ========================

async function analyzeURL() {
    const url = document.getElementById("urlInput").value.trim();
    if (!url) return alert("Please enter a URL to analyze.");
    const resultDiv = document.getElementById("urlResult");
    
    const prompt = `Analyze this URL for security risks, malware, or phishing: "${url}". Reply in EXACTLY this JSON format: {"threatLevel": <0-100 number>, "safeLevel": <0-100 number>, "explanation": "<brief analysis reason>"}`;
    const fallbackData = getUrlRisk(url);
    
    await runAnalysisLogic(prompt, resultDiv, fallbackData);
}

async function analyzeChat() {
    const text = document.getElementById("chatInput").value.trim();
    if (!text) return alert("Please enter a chat message to analyze.");
    const resultDiv = document.getElementById("chatResult");
    
    const prompt = `Analyze this chat message for phishing, urgent tone, or malicious intent: "${text}". Reply in EXACTLY this JSON format: {"threatLevel": <0-100 number>, "safeLevel": <0-100 number>, "explanation": "<brief analysis reason>"}`;
    const fallbackData = getChatRisk(text);
    
    await runAnalysisLogic(prompt, resultDiv, fallbackData);
}

async function analyzeNews() {
    const text = document.getElementById("newsInput").value.trim();
    if (!text) return alert("Please enter news content to analyze.");
    const resultDiv = document.getElementById("newsResult");
    
    const prompt = `Analyze this news snippet for being fake news, miracle claims, or emotional manipulation: "${text}". Reply in EXACTLY this JSON format: {"threatLevel": <0-100 number>, "safeLevel": <0-100 number>, "explanation": "<brief analysis reason>"}`;
    const fallbackData = getNewsRisk(text);
    
    await runAnalysisLogic(prompt, resultDiv, fallbackData);
}

// Shared Analysis Execution
async function runAnalysisLogic(prompt, resultDiv, fallbackData) {
    resultDiv.innerHTML = "<div class='cyber-result'>Analyzing...<br><small>Checking Gemini AI models...</small></div>";
    
    const apiKey = localStorage.getItem("cyberApiKey");
    
    if (!apiKey) {
        console.warn("No API key available, using Keyword AI Detection Fallback.");
        renderResult(resultDiv, fallbackData.threat, fallbackData.safe, fallbackData.reason + " (Local Engine Used)", fallbackData.keywords);
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: "You are a cybersecurity assistant. Always output valid JSON exactly in this format: {\"threatLevel\": <0-100 number>, \"safeLevel\": <0-100 number>, \"explanation\": \"<brief analysis reason>\"}." }]
                },
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    response_mime_type: "application/json"
                }
            })
        });

        if (!response.ok) throw new Error(`API returned ${response.status}`);
        
        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text.trim();
        
        // Ensure no markdown block wrappers
        const cleanContent = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanContent);
        
        renderResult(resultDiv, parsed.threatLevel, parsed.safeLevel, parsed.explanation, []);
    } catch (e) {
        console.error("Gemini API failed, falling back to local detection rules.", e);
        renderResult(resultDiv, fallbackData.threat, fallbackData.safe, fallbackData.reason + " (Offline Fallback)", fallbackData.keywords);
    }
}

// UI Renderer for Results
function renderResult(container, threat, safe, explanation, keywordsFound) {
    let statusClass = "status-safe";
    if (threat > 70) statusClass = "status-danger";
    else if (threat >= 40) statusClass = "status-medium";

    let keywordsHtml = "";
    if (keywordsFound && keywordsFound.length > 0) {
        keywordsHtml = `<div class='keyword-list'>Detected Keyword Triggers: <b>${keywordsFound.join(", ")}</b></div>`;
    }

    container.innerHTML = `
        <div class="cyber-result">
            <div class="explanation ${statusClass}">${explanation}</div>
            
            <div class="progress-container">
                <div class="progress-label">
                    <span>Safety Level</span>
                    <span class="status-safe">${safe}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill pb-safe" style="width: ${safe}%"></div>
                </div>
            </div>

            <div class="progress-container">
                <div class="progress-label">
                    <span>Threat Level</span>
                    <span class="status-danger">${threat}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill pb-threat" style="width: ${threat}%"></div>
                </div>
            </div>
            
            ${keywordsHtml}
        </div>
    `;
    
    // Trigger progress animation
    setTimeout(() => {
        const safeBar = container.querySelector(".pb-safe");
        const threatBar = container.querySelector(".pb-threat");
        if(safeBar) safeBar.style.width = safe + '%';
        if(threatBar) threatBar.style.width = threat + '%';
    }, 50);
}

// ==============================
// LOCAL KEYWORD FALLBACK ENGINES
// ==============================

function getUrlRisk(text) {
    const rules = ["http://", ".onion", "login", "verify", "bank", "free", "win", "@"];
    let found = rules.filter(r => text.toLowerCase().includes(r));
    if (text.length > 75) found.push("Long URL");
    
    return calculateRiskScore(found, "URL structure");
}

function getChatRisk(text) {
    const rules = ["password", "otp", "bank", "urgent", "send money", "win", "account locked", "verify"];
    let found = rules.filter(r => text.toLowerCase().includes(r));
    return calculateRiskScore(found, "chat message");
}

function getNewsRisk(text) {
    const rules = ["shocking", "unbelievable", "miracle", "100% true", "forward this", "secret", "exposed"];
    let found = rules.filter(r => text.toLowerCase().includes(r));
    return calculateRiskScore(found, "news content");
}

function calculateRiskScore(found, type) {
    if (found.length === 0) {
        return { threat: 5, safe: 95, reason: `This ${type} appears safe. No suspicious keywords detected.`, keywords: [] };
    } else if (found.length <= 2) {
        return { threat: 55, safe: 45, reason: `Moderate risk detected. Multiple trigger words found in this ${type}.`, keywords: found };
    } else {
        return { threat: 92, safe: 8, reason: `HIGH RISK! Dangerous patterns identified in this ${type}. Do not trust.`, keywords: found };
    }
}
