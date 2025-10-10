import { db } from './firebase.js';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Gemini API Configuration
const GEMINI_API_KEY = 'AIzaSyBCFPV2_KaDYDu5taBcc7u8WNHPppqJA6M';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Global variables
let chatMessages = [];
let conversationHistory = []; // Track full conversation with Gemini
let lastBotMessage = ''; // Track last bot message for context
let lastAskedParams = []; // Track what params we asked for
let pendingFunction = null; // Track pending function call
let currentYear = '';
let currentSection = '';
let isProcessing = false;
let aiPromptConfig = null; // Will load from JSON file

// ============================================
// LOAD AI CONFIGURATION
// ============================================

// Load AI prompt configuration from JSON
async function loadAIConfig() {
    try {
        const response = await fetch('./config/ai-prompt-config.json');
        aiPromptConfig = await response.json();
        console.log('✅ AI Configuration loaded successfully');
        return aiPromptConfig;
    } catch (error) {
        console.error('❌ Error loading AI config:', error);
        return null;
    }
}

// Fetch all current schedule data from Firestore
async function fetchCurrentScheduleData() {
    try {
        const q = query(
            collection(db, 'unified_schedules'),
            where('year', '==', currentYear),
            where('section', '==', currentSection)
        );
        
        const snapshot = await getDocs(q);
        const scheduleData = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            scheduleData.push({
                date: data.date,
                day: data.day,
                subject: data.subject,
                faculty: data.faculty || 'TBA',
                startTime: data.startTime,
                endTime: data.endTime
            });
        });
        
        // Sort by date and time
        scheduleData.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        });
        
        console.log(`📊 Fetched ${scheduleData.length} classes from Firestore`);
        return scheduleData;
    } catch (error) {
        console.error('❌ Error fetching schedule data:', error);
        return [];
    }
}

// Format schedule data for Gemini
function formatScheduleDataForGemini(scheduleData) {
    if (scheduleData.length === 0) {
        return "**CURRENT SCHEDULE: EMPTY**\nNo classes are currently scheduled.";
    }
    
    // Group by date
    const byDate = {};
    scheduleData.forEach(cls => {
        if (!byDate[cls.date]) byDate[cls.date] = [];
        byDate[cls.date].push(cls);
    });
    
    let formatted = "**CURRENT SCHEDULE DATA:**\n\n";
    formatted += `Total Classes: ${scheduleData.length}\n`;
    formatted += `Year: ${currentYear}, Section: ${currentSection}\n\n`;
    
    Object.keys(byDate).sort().forEach(date => {
        formatted += `📅 **${date} (${byDate[date][0].day}):**\n`;
        byDate[date].forEach(cls => {
            formatted += `   • ${cls.startTime}-${cls.endTime}: ${cls.subject}`;
            if (cls.faculty !== 'TBA') formatted += ` (${cls.faculty})`;
            formatted += '\n';
        });
        formatted += '\n';
    });
    
    return formatted;
}

// Build system prompt from config
async function buildSystemPrompt() {
    if (!aiPromptConfig) return '';
    
    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Fetch current schedule data from Firestore
    const scheduleData = await fetchCurrentScheduleData();
    const formattedSchedule = formatScheduleDataForGemini(scheduleData);
    
    const todayStr = formatDate(today);
    
    const promptText = `You are an AI Schedule Manager for college timetable.

📊 CURRENT DATABASE (All Classes):
${formattedSchedule}

📝 CONTEXT:
- Year: ${currentYear}
- Section: ${currentSection}  
- Today: ${todayStr} (${today.toLocaleDateString('en-US', { weekday: 'long' })})

Your job is to understand user requests about the college schedule and respond with the correct functions to call.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ AVAILABLE FUNCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. add(subject, startTime, endTime, date)
   - Adds a class to the schedule
   - Example: add('Data Structures and Algorithm','13:00','14:00','2025-10-10')

2. delete(subject, date, time)
   - Deletes a class from schedule
   - Use '*' for date/time to delete all instances
   - Example: delete('DSA','*','*') to delete all DSA classes

3. clear_all()
   - Deletes ALL classes for current year/section
   - Example: clear_all()

4. view(year, section)
   - Changes the year and section dropdown
   - Example: view('1st Year','Section A')

5. view_week()
   - Switches to week view
   - Example: view_week()

6. view_month()
   - Switches to month view
   - Example: view_month()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 IMPORTANT PARSING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Time parsing: 
   - "1pm" → '13:00'
   - "2pm" → '14:00'
   - "10-11" → startTime:'10:00', endTime:'11:00'
   - "1:00 pm to 2:00 pm" → startTime:'13:00', endTime:'14:00'

✅ Date parsing:
   - "today" → '${todayStr}'
   - "tomorrow" → calculate next day
   - Specific date: keep as-is

✅ Subject name expansion:
   - DSA → "Data Structures and Algorithm"
   - OOPS → "Object Oriented Programming"
   - DE → "Digital Electronics"
   - SE → "Software Engineering"
   - AEM → "Advance Engineering Mathematics"
   - TC → "Technical Communication"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 RESPONSE EXAMPLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User: "add a dsa class on today from 1:00 pm to 2:00 pm"
Response:
{
  "output": "Done! DSA class added for today from 1:00 pm to 2:00 pm",
  "functions": ["add('Data Structures and Algorithm','13:00','14:00','${todayStr}')"]
}

User: "Add Math, OOPS today 10-11"
Response:
{
  "output": "Done! Added 2 classes for today 10:00-11:00",
  "functions": [
    "add('Mathematics','10:00','11:00','${todayStr}')",
    "add('Object Oriented Programming','10:00','11:00','${todayStr}')"
  ]
}

User: "Delete all classes"
Response:
{
  "output": "Done! Cleared all classes",
  "functions": ["clear_all()"]
}

User: "Show 1st year section A"
Response:
{
  "output": "Showing 1st Year, Section A",
  "functions": ["view('1st Year','Section A')"]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ STRICT OUTPUT FORMAT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST respond ONLY with this JSON format:

{
  "output": "User-friendly message like 'Done!', 'Added!', 'Deleted!'",
  "functions": ["function_name('arg1','arg2','arg3')"]
}

If user request is unclear, respond with:
{
  "output": "Question to ask user",
  "functions": []
}

NOW PROCESS THE USER REQUEST AND RESPOND IN JSON FORMAT ONLY!`;
    
    return promptText;
}

// Clear conversation history
window.clearChatHistory = function() {
    conversationHistory = [];
    lastBotMessage = '';
    lastAskedParams = [];
    pendingFunction = null;
    
    // Clear UI
    const messagesContainer = document.getElementById('ai-chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="ai-welcome-message">
                <h3>👋 Hi! I'm your AI Schedule Assistant</h3>
                <div class="ai-features">
                    <div class="ai-feature">
                        <span class="ai-feature-icon">➕</span>
                        <p><strong>Add Classes</strong><br>
                        "Add DSA 10-11 from 9/10/2025 to 20/10/2025"</p>
                    </div>
                    <div class="ai-feature">
                        <span class="ai-feature-icon">🗑️</span>
                        <p><strong>Delete Classes</strong><br>
                        "Delete all Math classes"</p>
                    </div>
                    <div class="ai-feature">
                        <span class="ai-feature-icon">📸</span>
                        <p><strong>Upload Timetable</strong><br>
                        Click 📎 to upload image</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    addMessageToChat('bot', '🔄 Chat history cleared! How can I help you today?');
    console.log('✅ Chat history cleared');
};

// ============================================
// PRE-DEFINED FUNCTIONS (Schedule Operations)
// ============================================

// Function definitions that Gemini can call
const SCHEDULE_FUNCTIONS = {
    // Function 1: Add Class
    add_class: {
        name: "add_class",
        description: "Add a new class to the schedule. Can add single or multiple classes based on date range and days.",
        parameters: {
            type: "object",
            properties: {
                subject: {
                    type: "string",
                    description: "Subject name (e.g., 'DSA', 'Data Structures', 'Python')"
                },
                faculty: {
                    type: "string",
                    description: "Faculty/Teacher name (optional)"
                },
                days: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of day names like ['Monday', 'Tuesday', 'Wednesday']"
                },
                startTime: {
                    type: "string",
                    description: "Start time in HH:MM format (e.g., '09:00', '14:00')"
                },
                endTime: {
                    type: "string",
                    description: "End time in HH:MM format (e.g., '10:00', '15:00')"
                },
                startDate: {
                    type: "string",
                    description: "Start date in YYYY-MM-DD format (e.g., '2025-10-09')"
                },
                endDate: {
                    type: "string",
                    description: "End date in YYYY-MM-DD format (e.g., '2025-10-20')"
                }
            },
            required: ["subject", "startTime", "endTime", "startDate", "endDate"]
        }
    },
    
    // Function 2: Delete Class
    delete_class: {
        name: "delete_class",
        description: "Delete classes from the schedule based on subject name and/or date range.",
        parameters: {
            type: "object",
            properties: {
                subject: {
                    type: "string",
                    description: "Subject name to delete (e.g., 'DSA')"
                },
                startDate: {
                    type: "string",
                    description: "Start date of range to delete (YYYY-MM-DD)"
                },
                endDate: {
                    type: "string",
                    description: "End date of range to delete (YYYY-MM-DD)"
                },
                day: {
                    type: "string",
                    description: "Specific day to delete (e.g., 'Monday')"
                }
            },
            required: ["subject"]
        }
    },
    
    // Function 3: Update Class
    update_class: {
        name: "update_class",
        description: "Update existing class details like time, faculty, or subject name.",
        parameters: {
            type: "object",
            properties: {
                oldSubject: {
                    type: "string",
                    description: "Current subject name to find"
                },
                newSubject: {
                    type: "string",
                    description: "New subject name (optional)"
                },
                newFaculty: {
                    type: "string",
                    description: "New faculty name (optional)"
                },
                newStartTime: {
                    type: "string",
                    description: "New start time HH:MM (optional)"
                },
                newEndTime: {
                    type: "string",
                    description: "New end time HH:MM (optional)"
                },
                date: {
                    type: "string",
                    description: "Specific date to update (YYYY-MM-DD, optional)"
                }
            },
            required: ["oldSubject"]
        }
    },
    
    // Function 4: Query Schedule
    query_schedule: {
        name: "query_schedule",
        description: "Get information about existing schedule - what classes are scheduled, when, etc.",
        parameters: {
            type: "object",
            properties: {
                date: {
                    type: "string",
                    description: "Specific date to query (YYYY-MM-DD, optional)"
                },
                day: {
                    type: "string",
                    description: "Specific day to query (e.g., 'Monday', optional)"
                },
                subject: {
                    type: "string",
                    description: "Specific subject to search (optional)"
                }
            }
        }
    }
};

// Initialize AI Assistant
export function initializeAIAssistant(year, section) {
    currentYear = year;
    currentSection = section;
    
    // Create floating chat button and interface
    createChatUI();
}

// Update context when year/section changes
export function updateAIContext(year, section) {
    currentYear = year;
    currentSection = section;
}

// Create Chat UI
function createChatUI() {
    const chatHTML = `
        <!-- Floating Chat Button -->
        <button id="ai-chat-btn" class="ai-chat-button" onclick="toggleAIChat()">
            <span class="ai-icon">🤖</span>
            <span class="ai-text">AI Assistant</span>
        </button>

        <!-- Chat Window -->
        <div id="ai-chat-window" class="ai-chat-window">
            <div class="ai-chat-header">
                <div class="ai-header-title">
                    <span class="ai-avatar">🤖</span>
                    <div>
                        <div class="ai-title">Schedule AI Assistant</div>
                        <div class="ai-status">●Online</div>
                    </div>
                </div>
                <div class="ai-header-actions">
                    <button class="ai-clear-btn" onclick="clearChatHistory()" title="Clear chat history">
                        🗑️
                    </button>
                    <button class="ai-minimize-btn" onclick="toggleAIChat()">✕</button>
                </div>
            </div>
            
            <div id="ai-chat-messages" class="ai-chat-messages">
                <div class="ai-message ai-message-bot">
                    <div class="ai-message-content">
                        👋 Hi! I'm your AI Schedule Assistant. I can help you:
                        <br><br>
                        • Add classes: "DSA class 11 to 12 for next 10 days"
                        <br>
                        • Date ranges: "Add Python lab from 11/09/2025 to 15/09/2025"
                        <br>
                        • Upload schedule images - I'll read and create all classes!
                        <br>
                        • Quick commands: "Add Math Monday 9-10"
                        <br><br>
                        Just type or upload an image! 📸
                    </div>
                </div>
            </div>
            
            <div class="ai-chat-input-area">
                <input type="file" id="ai-image-input" accept="image/*" style="display: none;" onchange="handleImageUpload(event)">
                <button class="ai-attach-btn" onclick="document.getElementById('ai-image-input').click()" title="Upload schedule image">
                    📎
                </button>
                <input type="text" id="ai-chat-input" class="ai-chat-input" placeholder="Type your message or upload image..." onkeypress="handleChatKeyPress(event)">
                <button class="ai-send-btn" onclick="sendMessage()">
                    <span class="send-icon">📤</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', chatHTML);
}

// Toggle Chat Window
window.toggleAIChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    const chatBtn = document.getElementById('ai-chat-btn');
    
    if (chatWindow.classList.contains('active')) {
        chatWindow.classList.remove('active');
        chatBtn.classList.remove('hidden');
    } else {
        chatWindow.classList.add('active');
        chatBtn.classList.add('hidden');
        document.getElementById('ai-chat-input').focus();
    }
};

// Handle Enter Key
window.handleChatKeyPress = function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
};

// Send Message
window.sendMessage = async function() {
    const input = document.getElementById('ai-chat-input');
    const message = input.value.trim();
    
    if (!message || isProcessing) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    input.value = '';
    
    // Check if this is a response to pending image processing
    if (window.pendingImageData) {
        // User is providing date range for the image
        const dateRangeMatch = message.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:to|se|-)\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        
        if (dateRangeMatch) {
            const startDate = parseDateString(dateRangeMatch[1]);
            const endDate = parseDateString(dateRangeMatch[2]);
            
            addMessageToChat('bot', `✅ Got it! Processing timetable from ${startDate} to ${endDate}...`);
            
            await processImageWithDateRange(window.pendingImageData, startDate, endDate);
            return;
        } else if (message.toLowerCase().includes('current week') || message.toLowerCase().includes('this week')) {
            // Calculate current week dates
            const today = new Date();
            const startOfWeek = getWeekStart(today);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            
            const startDate = formatDate(startOfWeek);
            const endDate = formatDate(endOfWeek);
            
            addMessageToChat('bot', `✅ Processing current week (${startDate} to ${endDate})...`);
            
            await processImageWithDateRange(window.pendingImageData, startDate, endDate);
            return;
        } else if (message.toLowerCase() === 'yes' || message.toLowerCase() === 'haan' || message.toLowerCase() === 'ha') {
            // User confirmed, use current week as default
            const today = new Date();
            const startOfWeek = getWeekStart(today);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            
            const startDate = formatDate(startOfWeek);
            const endDate = formatDate(endOfWeek);
            
            addMessageToChat('bot', `✅ Great! Processing for current week (${startDate} to ${endDate})...`);
            
            await processImageWithDateRange(window.pendingImageData, startDate, endDate);
            return;
        }
    }
    
    // Normal message processing with conversation history
    await processAICommand(message);
};

// Handle Image Upload
window.handleImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file || isProcessing) return;
    
    addMessageToChat('user', `📸 Uploaded: ${file.name}`);
    
    // Convert image to base64
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result.split(',')[1];
        await processImageWithAI(base64Image);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
};

// Add Message to Chat
function addMessageToChat(type, content) {
    const messagesContainer = document.getElementById('ai-chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${type}`;
    messageDiv.innerHTML = `<div class="ai-message-content">${content}</div>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Process AI Command with Function Calling
async function processAICommand(userMessage) {
    isProcessing = true;
    addMessageToChat('bot', '🤔 Understanding your request...');
    
    try {
        // Get today's date and week information
        const today = new Date();
        const todayStr = formatDate(today);
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Load config if not loaded
        if (!aiPromptConfig) {
            await loadAIConfig();
        }
        
        // Build system prompt from JSON config (with current schedule data)
        const systemPrompt = await buildSystemPrompt();
        
        // Build conversation contents (include history for context)
        const contents = [...conversationHistory, {
            role: "user",
            parts: [{
                text: `${systemPrompt}

📅 CURRENT CONTEXT:
- Year: ${currentYear}
- Section: ${currentSection}  
- Today's Date: ${todayStr} (${dayName})

👤 USER REQUEST: "${userMessage}"

🎯 YOUR TASK: Analyze the request and CALL THE APPROPRIATE FUNCTION. Don't ask questions unless absolutely necessary.

� DECISION RULES:

✅ **CALL add_class IF:**
- User wants to add/create/schedule classes
- Has subject name (DSA, Python, Math, etc.)
- Has time OR can assume default time (if missing, use 09:00-10:00)
- Has dates OR can calculate from "next X days", "for X days", "from DATE to DATE"

✅ **CALL delete_class IF:**
- User wants to remove/delete classes
- Has subject name

✅ **CALL update_class IF:**
- User wants to change/modify/update classes
- Has old subject and new information

✅ **CALL query_schedule IF:**
- User asks "what classes", "show schedule", "list classes"

⏰ **TIME PARSING (Be Flexible):**
- "10 to 11" → "10:00" to "11:00"
- "10-11" → "10:00" to "11:00"
- "9am to 10am" → "09:00" to "10:00"
- Missing time? → Use "09:00" to "10:00" as default

📆 **DATE PARSING (Be Smart):**
- "for 10 days" → startDate: today, endDate: today + 10 days
- "next 10 days" → startDate: today, endDate: today + 10 days
- "9/10/2025 to 20/10/2025" → startDate: "2025-10-09", endDate: "2025-10-20"
- "from 9/10 to 20/10" → startDate: "2025-10-09", endDate: "2025-10-20"

👥 **DAYS PARSING:**
- Not specified → days: [] (empty array = all days)
- "Monday, Wednesday" → days: ["Monday", "Wednesday"]
- "weekdays" → days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

🎓 **SUBJECT NAMES:**
- DSA = Data Structures and Algorithm
- OOPS = Object Oriented Programming
- AEM = Advanced Engineering Mathematics
- Keep original name if not abbreviated

🚀 **EXAMPLES - TAKE ACTION IMMEDIATELY:**

User: "Add DSA from 9/10/2025 to 20/10/2025"
→ Call add_class({
  subject: "Data Structures and Algorithm",
  startTime: "09:00",
  endTime: "10:00",
  startDate: "2025-10-09",
  endDate: "2025-10-20",
  days: []
})

User: "Add DSA 10 to 11 for 10 days"
→ Call add_class({
  subject: "Data Structures and Algorithm",
  startTime: "10:00",
  endTime: "11:00",
  startDate: "${todayStr}",
  endDate: "${formatDate(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000))}",
  days: []
})

User: "subject is dsa for 10 days 10:00 to 11:00"
→ Call add_class({
  subject: "Data Structures and Algorithm",
  startTime: "10:00",
  endTime: "11:00",
  startDate: "${todayStr}",
  endDate: "${formatDate(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000))}",
  days: []
})

⚡ **BE DECISIVE:** 
- If you have subject + time + dates → CALL THE FUNCTION
- Don't ask for clarification if you can make reasonable assumptions
- Use empty days array [] if days not specified (means all days)
- Use default times if not specified
- Calculate dates from "for X days" or "next X days"`
            }]
        }];
        
        // Call Gemini API with conversation history
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: contents,
                tools: [{
                    function_declarations: Object.values(SCHEDULE_FUNCTIONS)
                }]
            })
        });

        const data = await response.json();
        console.log('Gemini Response:', data);
        
        // Remove "Understanding..." message
        removeLastBotMessage();
        
        // Try to parse JSON response from Gemini
        const parts = data.candidates[0]?.content?.parts || [];
        let textResponse = parts.map(p => p.text).join('').trim();
        
        console.log('Raw response:', textResponse);
        
        // Try to extract NEW JSON format: {output, functions}
        let newFormatMatch = textResponse.match(/\{[\s\S]*"output"[\s\S]*"functions"[\s\S]*\}/);
        if (newFormatMatch) {
            try {
                const jsonResponse = JSON.parse(newFormatMatch[0]);
                console.log('✅ New format detected:', jsonResponse);
                
                const output = jsonResponse.output || 'Processing...';
                const functions = jsonResponse.functions || [];
                
                // Show user-friendly output
                addMessageToChat('bot', output);
                
                // Execute backend functions
                if (functions.length > 0) {
                    console.log(`🔄 Executing ${functions.length} function(s)...`);
                    
                    for (const funcStr of functions) {
                        await executeBackendFunction(funcStr);
                    }
                }
                
                conversationHistory.push({
                    role: "model",
                    parts: [{ text: output }]
                });
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                addMessageToChat('bot', textResponse);
            }
        }
        // Try OLD format: {action, params}
        else {
            let jsonMatch = textResponse.match(/\{[\s\S]*"action"[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const jsonResponse = JSON.parse(jsonMatch[0]);
                    console.log('Parsed JSON (old format):', jsonResponse);
                    
                    const action = jsonResponse.action;
                    const params = jsonResponse.params || {};
                    
                    if (action === 'ask_clarification') {
                        // Gemini is asking for more info
                        const question = params.question || textResponse;
                        lastAskedParams = params.missing_params || [];
                        
                        addMessageToChat('bot', question);
                        lastBotMessage = question;
                        
                        conversationHistory.push({
                            role: "model",
                            parts: [{ text: question }]
                        });
                    } else if (action === 'multiple') {
                    // Multiple operations (e.g., "add DSA, OOPS, DE" or "delete all")
                    const operations = params.operations || [];
                    console.log(`🔄 Executing ${operations.length} operations...`);
                    
                    let successCount = 0;
                    for (const op of operations) {
                        try {
                            await executeFunctionCall({ name: op.action, args: op.params });
                            successCount++;
                        } catch (error) {
                            console.error(`❌ Operation failed:`, op, error);
                        }
                    }
                    
                    addMessageToChat('bot', `✅ Completed ${successCount}/${operations.length} operations successfully!`);
                } else if (action === 'add_class' || action === 'delete_class' || action === 'update_class' || action === 'query_schedule') {
                    // Gemini wants to call a function
                    await executeFunctionCall({ name: action, args: params });
                } else {
                    // Unknown action
                    addMessageToChat('bot', textResponse);
                }
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                    // Fallback to text response
                    addMessageToChat('bot', textResponse);
                }
            } else {
                // Check if Gemini used function calling (old way)
                let functionCalled = false;
                for (const part of parts) {
                    if (part.functionCall) {
                        functionCalled = true;
                        await executeFunctionCall(part.functionCall);
                    }
                }
                
                if (!functionCalled) {
                    // Plain text response
                    addMessageToChat('bot', textResponse || '✅ Request processed!');
                    conversationHistory.push({
                        role: "model",
                        parts: [{ text: textResponse }]
                    });
                }
            }
        }
        
        // Add user message to history (for next interaction)
        conversationHistory.push({
            role: "user",
            parts: [{ text: userMessage }]
        });
        
    } catch (error) {
        console.error('AI Error:', error);
        console.error('Full error:', error.message);
        removeLastBotMessage();
        const errorMsg = `❌ Error: ${error.message}. Try: "Add Python lab from 09/10/2025 to 11/10/2025"`;
        addMessageToChat('bot', errorMsg);
        lastBotMessage = errorMsg;
    } finally {
        isProcessing = false;
    }
}

// Execute backend function from new format
async function executeBackendFunction(funcStr) {
    console.log('🔧 Executing function:', funcStr);
    
    try {
        // Parse function name and arguments
        const match = funcStr.match(/^(\w+)\((.*)\)$/);
        if (!match) {
            console.error('Invalid function format:', funcStr);
            return;
        }
        
        const funcName = match[1];
        const argsStr = match[2];
        
        // Parse arguments (handle quoted strings)
        const args = [];
        let current = '';
        let inQuote = false;
        
        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];
            
            if (char === "'" || char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                args.push(current.trim().replace(/^['"]|['"]$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        if (current) {
            args.push(current.trim().replace(/^['"]|['"]$/g, ''));
        }
        
        console.log(`📋 Function: ${funcName}, Args:`, args);
        
        // Route to appropriate handler
        if (funcName === 'add') {
            // Direct Firebase - Add class (all users will see)
            await handleAddFunction(args);
        } else if (funcName === 'delete') {
            // Direct Firebase - Delete class (all users will see)
            await handleDeleteFunction(args);
        } else if (funcName === 'clear_all') {
            // Direct Firebase - Clear all classes (all users will see)
            await handleClearAllFunction();
        } else if (funcName === 'view') {
            // JavaScript only - Change view (only this user)
            await handleViewFunction(args);
        } else if (funcName === 'view_week') {
            // JavaScript only - Show this week
            await handleViewWeekFunction();
        } else if (funcName === 'view_month') {
            // JavaScript only - Show this month
            await handleViewMonthFunction();
        }
        
    } catch (error) {
        console.error('❌ Function execution error:', error);
        addMessageToChat('bot', '❌ Error: ' + error.message);
    }
}

// ============================================
// FIREBASE DIRECT OPERATIONS (All users see changes)
// ============================================

// Add class to Supabase - All users will see this change
async function handleAddFunction(args) {
    const [subject, startTime, endTime, date] = args;
    
    // Calculate day from date
    const dateObj = new Date(date);
    const day = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    const classData = {
        year: currentYear,
        section: currentSection,
        subject: subject,
        faculty: "TBA",
        startTime: startTime,
        endTime: endTime,
        startHour: parseInt(startTime.split(':')[0]),
        endHour: parseInt(endTime.split(':')[0]),
        date: date,
        day: day
    };
    
    console.log('📝 Adding to Supabase:', classData);
    
    try {
        await window.supabaseDB.addClass(classData);
        console.log('✅ Class added to Supabase');
        addMessageToChat('bot', `✅ Added ${subject} class for ${day} ${startTime}-${endTime}`);
        
        // Reload calendar to show new class
        if (typeof loadScheduleData === 'function') {
            await loadScheduleData();
        }
    } catch (error) {
        console.error('❌ Supabase add error:', error);
        addMessageToChat('bot', '❌ Error adding class: ' + error.message);
    }
}

// Delete class from Supabase - All users will see this change
async function handleDeleteFunction(args) {
    const [subject, date, time] = args;
    const deleteAll = (date === '*' || !date);
    
    console.log(`🗑️ Deleting from Supabase: ${subject}, deleteAll: ${deleteAll}`);
    
    try {
        const filters = {
            year: currentYear,
            section: currentSection,
            subject: subject
        };
        
        if (!deleteAll && date && date !== '*') {
            filters.date = date;
            if (time && time !== '*') {
                filters.time = time;
            }
        }
        
        const deletedClasses = await window.supabaseDB.deleteClass(filters);
        const deleteCount = deletedClasses.length;
        
        if (deleteCount === 0) {
            addMessageToChat('bot', `❌ No ${subject} classes found`);
            return;
        }
        
        console.log(`✅ Deleted ${deleteCount} class(es) from Supabase`);
        addMessageToChat('bot', `✅ 🗑️ Deleted ${deleteCount} ${subject} class(es)!`);
        
        // Reload calendar to show changes
        if (typeof loadScheduleData === 'function') {
            await loadScheduleData();
        }
    } catch (error) {
        console.error('❌ Supabase delete error:', error);
        addMessageToChat('bot', '❌ Error deleting: ' + error.message);
    }
}

// Clear all classes from Firebase - All users will see this change
async function handleClearAllFunction() {
    console.log('�️ Clearing all classes from Firebase');
    
    try {
        const q = query(
            collection(db, 'unified_schedules'),
            where('year', '==', currentYear),
            where('section', '==', currentSection)
        );
        
        const snapshot = await getDocs(q);
        const deleteCount = snapshot.size;
        
        if (deleteCount === 0) {
            addMessageToChat('bot', '❌ No classes to delete');
            return;
        }
        
        // Delete all documents
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        console.log(`✅ Cleared ${deleteCount} classes from Firebase`);
        addMessageToChat('bot', `✅ �️ Deleted all ${deleteCount} classes!`);
        
        // Calendar will auto-update via onSnapshot listener
    } catch (error) {
        console.error('❌ Firebase clear error:', error);
        addMessageToChat('bot', '❌ Error clearing classes: ' + error.message);
    }
}

// ============================================
// VIEW FUNCTIONS (JavaScript only - No Firebase write)
// ============================================

// Change year/section view - Only this user's view changes
async function handleViewFunction(args) {
    const [year, section] = args;
    
    console.log(`👁️ Changing view to: ${year}, ${section}`);
    
    // Update dropdowns
    const yearSelect = document.getElementById('yearSelect');
    const sectionSelect = document.getElementById('sectionSelect');
    
    if (yearSelect && year) {
        yearSelect.value = year;
        currentYear = year;
    }
    
    if (sectionSelect && section) {
        sectionSelect.value = section;
        currentSection = section;
    }
    
    // Trigger change event to reload data
    if (yearSelect) yearSelect.dispatchEvent(new Event('change'));
    
    addMessageToChat('bot', `✅ Showing schedule for ${year || currentYear}, ${section || currentSection}`);
}

// Show this week view - Only this user's view changes
async function handleViewWeekFunction() {
    console.log('📅 Switching to Week View');
    
    const weekButton = document.querySelector('button[onclick*="This Week"]') || 
                      document.querySelector('.week-view-btn') ||
                      document.getElementById('weekViewBtn');
    
    if (weekButton) {
        weekButton.click();
        addMessageToChat('bot', '✅ Showing This Week view');
    } else {
        // Fallback - manually switch view
        if (typeof window.showWeekView === 'function') {
            window.showWeekView();
            addMessageToChat('bot', '✅ Showing This Week view');
        } else {
            addMessageToChat('bot', '❌ Week view button not found');
        }
    }
}

// Show this month view - Only this user's view changes
async function handleViewMonthFunction() {
    console.log('📅 Switching to Month View');
    
    const monthButton = document.querySelector('button[onclick*="This Month"]') ||
                       document.querySelector('.month-view-btn') ||
                       document.getElementById('monthViewBtn');
    
    if (monthButton) {
        monthButton.click();
        addMessageToChat('bot', '✅ Showing This Month view');
    } else {
        // Fallback - manually switch view
        if (typeof window.showMonthView === 'function') {
            window.showMonthView();
            addMessageToChat('bot', '✅ Showing This Month view');
        } else {
            addMessageToChat('bot', '❌ Month view button not found');
        }
    }
}

// Execute the function that Gemini chose (OLD FORMAT)
async function executeFunctionCall(functionCall) {
    const functionName = functionCall.name;
    const args = functionCall.args;
    
    addMessageToChat('bot', `⚡ Executing: ${functionName}...`);
    
    try {
        let result;
        
        switch(functionName) {
            case 'add_class':
                result = await executeAddClass(args);
                break;
            case 'delete_class':
                result = await executeDeleteClass(args);
                break;
            case 'update_class':
                result = await executeUpdateClass(args);
                break;
            case 'query_schedule':
                result = await executeQuerySchedule(args);
                break;
            default:
                result = { success: false, message: 'Unknown function' };
        }
        
        // Show result to user
        if (result.success) {
            addMessageToChat('bot', `✅ ${result.message}`);
        } else {
            addMessageToChat('bot', `❌ ${result.message}`);
        }
        
        // Refresh schedule view
        if (typeof window.loadScheduleData === 'function') {
            window.loadScheduleData();
        }
        
    } catch (error) {
        console.error('Function execution error:', error);
        addMessageToChat('bot', '❌ Error executing operation');
    }
}

// ============================================
// ACTUAL FUNCTION IMPLEMENTATIONS
// ============================================

// Function 1 Implementation: Add Class
async function executeAddClass(args) {
    console.log('🎯 executeAddClass called with args:', args);
    
    const { subject, faculty, days, startTime, endTime, startDate, endDate } = args;
    
    // Validate required fields
    if (!subject || !startTime || !endTime || !startDate || !endDate) {
        return {
            success: false,
            message: '❌ Missing required information. Need: subject, startTime, endTime, startDate, endDate'
        };
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
            success: false,
            message: `❌ Invalid dates. Start: ${startDate}, End: ${endDate}`
        };
    }
    
    const classesToAdd = [];
    
    // Loop through date range
    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Check if this day should be included
        if (!days || days.length === 0 || days.includes(dayName)) {
            const dateStr = formatDate(currentDate);
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            
            const classData = {
                id: `${dateStr}-${startTime.replace(':', '')}-${Date.now()}-${Math.random()}`,
                year: currentYear,
                section: currentSection,
                date: dateStr,
                day: dayName,
                subject: subject,
                faculty: faculty || 'TBA',
                startTime: startTime,
                endTime: endTime,
                startHour: startHour + startMin / 60,
                endHour: endHour + endMin / 60,
                createdAt: new Date().toISOString()
            };
            
            classesToAdd.push(classData);
            console.log(`📅 Adding class on ${dateStr} (${dayName})`);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (classesToAdd.length === 0) {
        return {
            success: false,
            message: '⚠️ No classes to add. Check date range and day filters.'
        };
    }
    
    console.log(`📚 Adding ${classesToAdd.length} classes to Firebase...`);
    
    // Batch add to Firebase
    try {
        const promises = classesToAdd.map(cls => addDoc(collection(db, 'unified_schedules'), cls));
        await Promise.all(promises);
        
        console.log('✅ Classes added successfully!');
        
        return {
            success: true,
            message: `🎉 Added ${classesToAdd.length} ${subject} class(es) from ${formatDate(start)} to ${formatDate(end)}!`
        };
    } catch (error) {
        console.error('❌ Firebase error:', error);
        return {
            success: false,
            message: `❌ Database error: ${error.message}`
        };
    }
}

// Function 2 Implementation: Delete Class
async function executeDeleteClass(args) {
    const { subject, startDate, endDate, day } = args;
    
    // Query classes to delete
    let q = query(
        collection(db, 'unified_schedules'),
        where('year', '==', currentYear),
        where('section', '==', currentSection),
        where('subject', '==', subject)
    );
    
    const snapshot = await getDocs(q);
    const toDelete = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        let shouldDelete = true;
        
        // Apply additional filters
        if (startDate && endDate) {
            const classDate = new Date(data.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            shouldDelete = classDate >= start && classDate <= end;
        }
        
        if (day && data.day !== day) {
            shouldDelete = false;
        }
        
        if (shouldDelete) {
            toDelete.push(deleteDoc(doc.ref));
        }
    });
    
    await Promise.all(toDelete);
    
    return {
        success: true,
        message: `🗑️ Deleted ${toDelete.length} ${subject} class(es)!`
    };
}

// Function 3 Implementation: Update Class
async function executeUpdateClass(args) {
    const { oldSubject, newSubject, newFaculty, newStartTime, newEndTime, date } = args;
    
    // Query classes to update
    let q = query(
        collection(db, 'unified_schedules'),
        where('year', '==', currentYear),
        where('section', '==', currentSection),
        where('subject', '==', oldSubject)
    );
    
    if (date) {
        q = query(q, where('date', '==', date));
    }
    
    const snapshot = await getDocs(q);
    const updates = [];
    
    snapshot.forEach(docSnapshot => {
        const updateData = {};
        
        if (newSubject) updateData.subject = newSubject;
        if (newFaculty) updateData.faculty = newFaculty;
        if (newStartTime) {
            updateData.startTime = newStartTime;
            const [h, m] = newStartTime.split(':').map(Number);
            updateData.startHour = h + m / 60;
        }
        if (newEndTime) {
            updateData.endTime = newEndTime;
            const [h, m] = newEndTime.split(':').map(Number);
            updateData.endHour = h + m / 60;
        }
        
        updates.push(updateDoc(docSnapshot.ref, updateData));
    });
    
    await Promise.all(updates);
    
    return {
        success: true,
        message: `✏️ Updated ${updates.length} ${oldSubject} class(es)!`
    };
}

// Function 4 Implementation: Query Schedule
async function executeQuerySchedule(args) {
    const { date, day, subject } = args;
    
    console.log('🔍 Query Schedule called with:', { date, day, subject, year: currentYear, section: currentSection });
    
    // Query schedule
    let q = query(
        collection(db, 'unified_schedules'),
        where('year', '==', currentYear),
        where('section', '==', currentSection)
    );
    
    if (date) q = query(q, where('date', '==', date));
    if (day) q = query(q, where('day', '==', day));
    if (subject) q = query(q, where('subject', '==', subject));
    
    const snapshot = await getDocs(q);
    console.log(`📊 Found ${snapshot.size} documents in Firebase`);
    
    const classes = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   • ${data.date} ${data.day}: ${data.subject} ${data.startTime}-${data.endTime}`);
        classes.push(data);
    });
    
    if (classes.length === 0) {
        // Check if there's ANY data in database
        const allDataQuery = query(collection(db, 'unified_schedules'));
        const allData = await getDocs(allDataQuery);
        
        console.log(`⚠️ No classes found for Year ${currentYear}, Section ${currentSection}`);
        console.log(`📊 Total classes in database: ${allData.size}`);
        
        if (allData.size > 0) {
            console.log('Available data:');
            allData.forEach(doc => {
                const d = doc.data();
                console.log(`   • Year ${d.year}, Section ${d.section}: ${d.date} ${d.subject}`);
            });
        }
        
        return {
            success: true,
            message: `📅 No classes found for Year ${currentYear}, Section ${currentSection}.\n\n💡 Tip: Make sure you've selected the correct Year and Section at the top of the page, then add classes using the AI assistant.`
        };
    }
    
    // Format response
    classes.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    let message = `📚 Found ${classes.length} class(es) for Year ${currentYear}, Section ${currentSection}:\n\n`;
    classes.forEach(cls => {
        message += `• ${cls.subject} - ${cls.day} ${cls.date} ${cls.startTime}-${cls.endTime}`;
        if (cls.faculty !== 'TBA') message += ` (${cls.faculty})`;
        message += '\n';
    });
    
    return {
        success: true,
        message: message
    };
}

// OLD FUNCTION - Keep for image processing
async function processAICommandOLD(userMessage) {
    isProcessing = true;
    addMessageToChat('bot', '🤔 Processing your request...');
    
    try {
        const prompt = `You are a schedule management AI assistant. The current context is:
- Year: ${currentYear}
- Section: ${currentSection}
- Current Date: ${new Date().toLocaleDateString()}

User request: "${userMessage}"

Analyze this request and extract schedule information. Return a JSON object with this structure:
{
  "action": "add_class" or "delete_class" or "query",
  "classes": [
    {
      "subject": "subject name",
      "faculty": "faculty name (if mentioned)",
      "days": ["Monday", "Tuesday", etc.],
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD"
    }
  ],
  "message": "Human-friendly response explaining what you understood"
}

Examples:
- "DSA class 11 to 12 for next 10 days" → add classes for next 10 days, 11:00-12:00
- "Add Python lab Monday 2-4" → add single class Monday 14:00-16:00
- "11/09/2025 to 15/09/2025 Math class 9-10" → add for date range

Return ONLY valid JSON, no other text.`;

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Parse AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const scheduleData = JSON.parse(jsonMatch[0]);
            await executeScheduleAction(scheduleData);
        } else {
            addMessageToChat('bot', '❌ Sorry, I couldn\'t understand that. Please try: "Add DSA class 11-12 for next 10 days"');
        }
        
    } catch (error) {
        console.error('AI Error:', error);
        addMessageToChat('bot', '❌ Sorry, something went wrong. Please try again.');
    } finally {
        isProcessing = false;
        removeLastBotMessage(); // Remove "Processing..." message
    }
}

// Process Image with AI (using function calling)
async function processImageWithAI(base64Image) {
    isProcessing = true;
    addMessageToChat('bot', '📸 Analyzing your image...');
    
    try {
        // STEP 1: Ask Gemini to analyze what's in the image
        const analysisResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [
                        { 
                            text: `🔍 ANALYZE THIS IMAGE:

**Your Task:** Carefully examine this image and tell me what you see.

**Questions to answer:**
1. Is this a timetable/schedule? (Yes/No)
2. If yes, what type? (Weekly timetable, exam schedule, class schedule, etc.)
3. What information can you extract? (Days, subjects, times, faculty names)
4. Is the image clear enough to read all details?
5. What is the structure? (Grid/table format, list format, etc.)

**Be thorough and descriptive. Describe what you see in detail.**

Current Context (if this is a timetable):
- Student Year: ${currentYear}
- Section: ${currentSection}
- Today's Date: ${formatDate(new Date())}

Scan the entire image carefully and provide a detailed analysis.`
                        },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                }]
            })
        });

        const analysisData = await analysisResponse.json();
        const analysisText = analysisData.candidates[0]?.content?.parts[0]?.text || '';
        
        console.log('📊 Image Analysis:', analysisText);
        
        // Remove "Analyzing..." message
        removeLastBotMessage();
        
        // Show analysis to user
        addMessageToChat('bot', `🔍 **Image Analysis:**\n\n${analysisText}`);
        
        // Check if it's a timetable
        const isTimetable = analysisText.toLowerCase().includes('timetable') || 
                           analysisText.toLowerCase().includes('schedule') ||
                           analysisText.toLowerCase().includes('time table');
        
        if (!isTimetable) {
            addMessageToChat('bot', '❓ This doesn\'t appear to be a timetable. If it is, please confirm and I\'ll process it.');
            isProcessing = false;
            return;
        }
        
        // STEP 2: Ask user for confirmation and date range
        addMessageToChat('bot', `📅 **Ready to extract classes!**\n\nPlease provide the date range for this timetable:\nExample: "from 9/10/2025 to 15/10/2025" or "for current week"`);
        
        // Store image for later processing
        window.pendingImageData = base64Image;
        window.pendingImageAnalysis = analysisText;
        isProcessing = false;
        
    } catch (error) {
        console.error('Image Analysis Error:', error);
        removeLastBotMessage();
        addMessageToChat('bot', '❌ Error analyzing image. Please try again.');
        isProcessing = false;
    }
}

// Process image with confirmed date range
async function processImageWithDateRange(base64Image, startDate, endDate) {
    isProcessing = true;
    addMessageToChat('bot', '🔄 Extracting all classes from the timetable...');
    
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [
                        { 
                            text: `📚 EXTRACT ALL CLASSES FROM THIS TIMETABLE

**Context:**
- Year: ${currentYear}
- Section: ${currentSection}
- Date Range: ${startDate} to ${endDate}

**Your Task:** 
Scan this timetable image thoroughly and extract EVERY class entry.

**Instructions:**
1. **Read each row and column carefully**
2. **Extract:**
   - Day (Monday, Tuesday, etc.)
   - Time slots (e.g., 9:00-10:00, 10:00-11:00)
   - Subject names (DSA, DE, AEM, SE, OOPS, TC, Training, etc.)
   - Faculty names (if visible in the image)

3. **For EACH class you find, call add_class function with:**
   - subject: Full subject name (e.g., "Data Structures and Algorithm" for DSA)
   - faculty: Faculty name from the table (or "TBA" if not found)
   - days: Array with single day [e.g., ["Monday"]]
   - startTime: Start time in 24-hour format (e.g., "09:00")
   - endTime: End time in 24-hour format (e.g., "10:00")
   - startDate: "${startDate}"
   - endDate: "${endDate}"

4. **Subject Name Mapping:**
   - DSA → "Data Structures and Algorithm"
   - DE → "Digital Electronics"
   - AEM → "Advance Engineering Mathematics"
   - SE → "Software Engineering"
   - OOPS → "Object Oriented Programming"
   - TC → "Technical Communication"
   - OOPS LAB → "OOPS Lab"
   - DSA LAB → "DSA Lab"
   - DE LAB → "DE Lab"
   - SE LAB → "SE Lab"
   - Training → "Training"
   - LUNCH → "Lunch Break"

5. **Time Conversion:**
   - 9:00-10:00 → startTime: "09:00", endTime: "10:00"
   - 10:00-11:00 → startTime: "10:00", endTime: "11:00"
   - 2:00-3:00 → startTime: "14:00", endTime: "15:00"

6. **Call add_class for EACH individual class entry**
   - Don't combine multiple classes
   - Each time slot = separate function call

**Example:** If Monday has DSA 9-10, DE 10-11, and Training 11-12:
- Call add_class for DSA (9-10, Monday)
- Call add_class for DE (10-11, Monday)
- Call add_class for Training (11-12, Monday)

**Be thorough! Extract every single class from the image.**`
                        },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                }],
                tools: [{
                    function_declarations: Object.values(SCHEDULE_FUNCTIONS)
                }]
            })
        });

        const data = await response.json();
        console.log('🎯 Image Extraction Response:', data);
        
        removeLastBotMessage();
        
        // Gemini will call add_class multiple times for each class in image
        const parts = data.candidates[0]?.content?.parts || [];
        let totalAdded = 0;
        let functionCalls = [];
        
        // Collect all function calls
        for (const part of parts) {
            if (part.functionCall) {
                functionCalls.push(part.functionCall);
            }
        }
        
        if (functionCalls.length === 0) {
            addMessageToChat('bot', '⚠️ No classes found in the image. The image might be unclear or not a timetable.');
            isProcessing = false;
            return;
        }
        
        addMessageToChat('bot', `📊 Found ${functionCalls.length} class entries. Adding them now...`);
        
        // Execute all function calls
        for (const functionCall of functionCalls) {
            try {
                const result = await executeFunctionCall(functionCall);
                if (result.success) {
                    // Extract number from message
                    const match = result.message.match(/\d+/);
                    if (match) totalAdded += parseInt(match[0]);
                }
            } catch (error) {
                console.error('Error executing function call:', error);
            }
        }
        
        if (totalAdded > 0) {
            addMessageToChat('bot', `✅ Successfully added ${totalAdded} classes from the timetable! 🎉\n\nCheck your schedule view to see all the classes.`);
        } else {
            addMessageToChat('bot', '⚠️ Classes processed but none were added. Check console for details.');
        }
        
        // Clear pending data
        window.pendingImageData = null;
        window.pendingImageAnalysis = null;
        
    } catch (error) {
        console.error('Image Extraction Error:', error);
        removeLastBotMessage();
        addMessageToChat('bot', '❌ Error extracting classes. Please try again.');
    } finally {
        isProcessing = false;
    }
}

// OLD Image processing - Keep as backup
async function processImageWithAIOLD(base64Image) {
    isProcessing = true;
    addMessageToChat('bot', '📸 Reading your schedule image...');
    
    try {
        const prompt = `You are analyzing a college schedule/timetable image. Extract ALL classes from this image.

Current context:
- Year: ${currentYear}
- Section: ${currentSection}

Return a JSON object with this structure:
{
  "action": "add_class",
  "classes": [
    {
      "subject": "subject abbreviation or full name",
      "faculty": "faculty name if visible",
      "day": "Monday/Tuesday/etc",
      "startTime": "HH:MM (24-hour format)",
      "endTime": "HH:MM",
      "notes": "LAB/Training/etc if mentioned"
    }
  ],
  "message": "Found X classes in the schedule"
}

Extract time slots like "9:00-10:00" → startTime: "09:00", endTime: "10:00"
If you see "LUNCH" or breaks, skip them.
Return ONLY valid JSON.`;

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Parse AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const scheduleData = JSON.parse(jsonMatch[0]);
            await executeScheduleActionFromImage(scheduleData);
        } else {
            addMessageToChat('bot', '❌ Couldn\'t read the schedule from image. Please try a clearer image.');
        }
        
    } catch (error) {
        console.error('Image AI Error:', error);
        addMessageToChat('bot', '❌ Error processing image. Please try again with a clearer schedule image.');
    } finally {
        isProcessing = false;
        removeLastBotMessage(); // Remove "Reading..." message
    }
}

// Execute Schedule Action (Text Commands)
async function executeScheduleAction(scheduleData) {
    if (scheduleData.action === 'add_class' && scheduleData.classes) {
        addMessageToChat('bot', `✅ ${scheduleData.message}`);
        
        let addedCount = 0;
        const promises = [];
        
        for (const classInfo of scheduleData.classes) {
            // Calculate date range
            const startDate = new Date(classInfo.startDate);
            const endDate = new Date(classInfo.endDate);
            
            // Get day indices
            const dayMap = {
                'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
                'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
            };
            
            // Loop through date range
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
                
                // Check if this day is in the requested days
                if (!classInfo.days || classInfo.days.length === 0 || classInfo.days.includes(dayName)) {
                    const dateStr = formatDate(currentDate);
                    const [startHour, startMin] = classInfo.startTime.split(':').map(Number);
                    const [endHour, endMin] = classInfo.endTime.split(':').map(Number);
                    
                    const classData = {
                        id: `${dateStr}-${classInfo.startTime.replace(':', '')}-${Date.now()}-${Math.random()}`,
                        year: currentYear,
                        section: currentSection,
                        date: dateStr,
                        day: dayName,
                        subject: classInfo.subject,
                        faculty: classInfo.faculty || 'TBA',
                        startTime: classInfo.startTime,
                        endTime: classInfo.endTime,
                        startHour: startHour + startMin / 60,
                        endHour: endHour + endMin / 60,
                        createdAt: new Date().toISOString()
                    };
                    
                    promises.push(addDoc(collection(db, 'unified_schedules'), classData));
                    addedCount++;
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        await Promise.all(promises);
        addMessageToChat('bot', `🎉 Successfully added ${addedCount} class(es) to your schedule!`);
        
        // Trigger reload if on schedule page
        if (typeof window.loadScheduleData === 'function') {
            window.loadScheduleData();
        }
    } else {
        addMessageToChat('bot', scheduleData.message || '✅ Request processed!');
    }
}

// Execute Schedule Action from Image
async function executeScheduleActionFromImage(scheduleData) {
    if (scheduleData.action === 'add_class' && scheduleData.classes) {
        addMessageToChat('bot', `📚 ${scheduleData.message}`);
        addMessageToChat('bot', '⏳ Creating classes in your schedule...');
        
        let addedCount = 0;
        const promises = [];
        
        // Get current week's Monday
        const today = new Date();
        const monday = getWeekStart(today);
        
        for (const classInfo of scheduleData.classes) {
            // Map day name to date
            const dayMap = {
                'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 
                'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
            };
            
            const dayOffset = dayMap[classInfo.day];
            if (dayOffset === undefined) continue;
            
            const classDate = new Date(monday);
            classDate.setDate(classDate.getDate() + dayOffset);
            
            const dateStr = formatDate(classDate);
            const [startHour, startMin] = classInfo.startTime.split(':').map(Number);
            const [endHour, endMin] = classInfo.endTime.split(':').map(Number);
            
            const classData = {
                id: `${dateStr}-${classInfo.startTime.replace(':', '')}-${Date.now()}-${Math.random()}`,
                year: currentYear,
                section: currentSection,
                date: dateStr,
                day: classInfo.day,
                subject: classInfo.subject,
                faculty: classInfo.faculty || 'TBA',
                startTime: classInfo.startTime,
                endTime: classInfo.endTime,
                startHour: startHour + startMin / 60,
                endHour: endHour + endMin / 60,
                notes: classInfo.notes || '',
                createdAt: new Date().toISOString()
            };
            
            promises.push(addDoc(collection(db, 'unified_schedules'), classData));
            addedCount++;
        }
        
        await Promise.all(promises);
        addMessageToChat('bot', `🎉 Successfully added ${addedCount} class(es) from the image!`);
        
        // Trigger reload
        if (typeof window.loadScheduleData === 'function') {
            window.loadScheduleData();
        }
    } else {
        addMessageToChat('bot', '❌ No classes found in the image. Please try a clearer image.');
    }
}

// Helper Functions
function removeLastBotMessage() {
    const messages = document.querySelectorAll('.ai-message-bot');
    if (messages.length > 0) {
        messages[messages.length - 1].remove();
    }
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to parse date string (DD/MM/YYYY or MM/DD/YYYY)
function parseDateString(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    // Assume DD/MM/YYYY format (common in India)
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    // Validate
    if (day > 12) {
        // Definitely DD/MM/YYYY
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else {
        // Could be either, assume DD/MM/YYYY
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Initialize AI Assistant
(async function() {
    // Load AI configuration
    await loadAIConfig();
    
    console.log('\n🤖 AI Assistant Loaded!');
    console.log('📊 Current Settings:');
    console.log('   Year:', currentYear || '❌ NOT SET - Please select from dropdown');
    console.log('   Section:', currentSection || '❌ NOT SET - Please select from dropdown');
    
    if (aiPromptConfig) {
        console.log('✅ JSON Configuration loaded');
        console.log('   Functions available:', Object.keys(SCHEDULE_FUNCTIONS).join(', '));
    }
})();

// Add global helper for debugging
window.checkAISettings = function() {
    console.log('\n🔍 AI Assistant Settings Check:');
    console.log('   Year:', currentYear || '❌ NOT SET');
    console.log('   Section:', currentSection || '❌ NOT SET');
    if (!currentYear || !currentSection) {
        console.log('\n⚠️ Please select Year and Section from the dropdowns at the top of the page!');
    } else {
        console.log(`\n✅ Settings OK - Adding classes to Year ${currentYear}, Section ${currentSection}`);
    }
    return { year: currentYear, section: currentSection };
};

window.showAllClasses = async function() {
    console.log('\n📚 Fetching all classes from Firebase...');
    const q = query(collection(db, 'unified_schedules'));
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} total classes in database\n`);
    
    snapshot.forEach(doc => {
        const d = doc.data();
        console.log(`• Year ${d.year}, Section ${d.section}: ${d.date} ${d.day} - ${d.subject} (${d.startTime}-${d.endTime})`);
    });
    
    return snapshot.size;
};

console.log('\n💡 Debug Commands:');
console.log('   • checkAISettings() - Check current year/section');
console.log('   • showAllClasses() - List all classes in database');
console.log('\n');

