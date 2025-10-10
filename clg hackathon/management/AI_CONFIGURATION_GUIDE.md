# 🤖 AI Schedule Manager - Complete Configuration Guide

## 📋 System Overview

Your AI agent receives user prompts and responds with function calls to manage the college schedule.

---

## 🎯 How It Works

### 1. User Input
```
User types: "add a dsa class on today from 1:00 pm to 2:00 pm"
```

### 2. System Builds Prompt for AI
The system creates a comprehensive prompt that includes:
- **User Request**: The actual user input
- **Current Database**: All existing classes from Firestore
- **Context**: Year, Section, Today's date
- **Available Functions**: List of all 6 functions
- **Parsing Rules**: How to convert "1pm" → "13:00", "DSA" → "Data Structures and Algorithm"
- **Examples**: Show AI how to respond correctly

### 3. AI Processes and Responds
The AI analyzes everything and responds in **JSON format**:
```json
{
  "output": "Done! DSA class added for today from 1:00 pm to 2:00 pm",
  "functions": ["add('Data Structures and Algorithm','13:00','14:00','2025-10-10')"]
}
```

### 4. Backend Processes Functions
- **output**: Shown to user as confirmation message
- **functions**: Executed by backend (Firebase operations or JavaScript DOM changes)

---

## 🔧 Available Functions

### 1. **add** (Firebase - All users see)
```javascript
add(subject, startTime, endTime, date)

Example:
add('Data Structures and Algorithm','13:00','14:00','2025-10-10')
```

**What it does:**
- Adds class to Firebase `unified_schedules` collection
- All users see the new class immediately
- Auto-calculates day from date
- Sets faculty as "TBA"

---

### 2. **delete** (Firebase - All users see)
```javascript
delete(subject, date, time)

Examples:
delete('DSA','2025-10-10','13:00')  // Delete specific class
delete('DSA','*','*')                // Delete ALL DSA classes
```

**What it does:**
- Queries Firebase for matching classes
- Deletes them
- All users see changes immediately

---

### 3. **clear_all** (Firebase - All users see)
```javascript
clear_all()

Example:
clear_all()
```

**What it does:**
- Deletes ALL classes for current year/section
- All users see empty calendar

---

### 4. **view** (JavaScript - Only this user)
```javascript
view(year, section)

Example:
view('1st Year','Section A')
```

**What it does:**
- Changes dropdown values using JavaScript
- Only this user's view changes
- No Firebase write

---

### 5. **view_week** (JavaScript - Only this user)
```javascript
view_week()

Example:
view_week()
```

**What it does:**
- Clicks "This Week" button
- Only this user sees week view

---

### 6. **view_month** (JavaScript - Only this user)
```javascript
view_month()

Example:
view_month()
```

**What it does:**
- Clicks "This Month" button
- Only this user sees month view

---

## 📝 Parsing Rules

### Time Parsing
```
User says: "1pm"           → AI converts to: "13:00"
User says: "2pm"           → AI converts to: "14:00"
User says: "10-11"         → AI converts to: startTime:"10:00", endTime:"11:00"
User says: "1:00 pm to 2:00 pm" → AI converts to: startTime:"13:00", endTime:"14:00"
```

### Date Parsing
```
User says: "today"         → AI uses: {{TODAY_DATE}} (e.g., "2025-10-10")
User says: "tomorrow"      → AI calculates next day
```

### Subject Name Expansion
```
User says: "DSA"           → AI expands to: "Data Structures and Algorithm"
User says: "OOPS"          → AI expands to: "Object Oriented Programming"
User says: "DE"            → AI expands to: "Digital Electronics"
User says: "SE"            → AI expands to: "Software Engineering"
User says: "AEM"           → AI expands to: "Advance Engineering Mathematics"
User says: "TC"            → AI expands to: "Technical Communication"
```

---

## 🎯 Example Scenarios

### Example 1: Add Single Class
```
User: "add a dsa class on today from 1:00 pm to 2:00 pm"

AI Response:
{
  "output": "Done! DSA class added for today from 1:00 pm to 2:00 pm",
  "functions": ["add('Data Structures and Algorithm','13:00','14:00','2025-10-10')"]
}

What happens:
1. AI sees "DSA" → expands to "Data Structures and Algorithm"
2. AI sees "1:00 pm" → converts to "13:00"
3. AI sees "2:00 pm" → converts to "14:00"
4. AI sees "today" → uses current date "2025-10-10"
5. Generates add() function with correct parameters
6. Backend executes function → Adds to Firebase
7. All users see the new class!
```

---

### Example 2: Add Multiple Classes
```
User: "Add Math, OOPS, DE today 10-11"

AI Response:
{
  "output": "Done! Added 3 classes for today 10:00-11:00",
  "functions": [
    "add('Mathematics','10:00','11:00','2025-10-10')",
    "add('Object Oriented Programming','10:00','11:00','2025-10-10')",
    "add('Digital Electronics','10:00','11:00','2025-10-10')"
  ]
}

What happens:
1. AI sees 3 subjects → generates 3 add() functions
2. Each function has same time and date
3. Backend executes all 3 functions
4. All users see 3 new classes!
```

---

### Example 3: Delete All Classes
```
User: "Delete all classes" or "Clear everything"

AI Response:
{
  "output": "Done! Cleared all classes",
  "functions": ["clear_all()"]
}

What happens:
1. AI understands user wants to delete everything
2. Generates clear_all() function
3. Backend deletes all classes for current year/section
4. All users see empty calendar!
```

---

### Example 4: View Different Year/Section
```
User: "Show me 1st year section A"

AI Response:
{
  "output": "Showing 1st Year, Section A",
  "functions": ["view('1st Year','Section A')"]
}

What happens:
1. AI generates view() function
2. Backend changes dropdown values using JavaScript
3. Only this user's view changes (no Firebase write)
4. Other users still see their selected year/section
```

---

### Example 5: Missing Information
```
User: "Add Python class"

AI Response:
{
  "output": "Sure! What time and date?",
  "functions": []
}

What happens:
1. AI sees missing required parameters (time, date)
2. Asks user for clarification
3. No functions generated (empty array)
4. Waits for user to provide more info
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────┐
│   User Types Message    │
│  "add dsa today 1-2pm"  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  System Builds Prompt   │
│  - User request         │
│  - Current database     │
│  - Context (year/sec)   │
│  - Available functions  │
│  - Parsing rules        │
│  - Examples             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Send to Gemini API    │
│  (Google Gemini 2.0)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  AI Analyzes & Responds │
│  {                      │
│    "output": "Done!",   │
│    "functions": [...]   │
│  }                      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Parse JSON Response    │
│  Extract:               │
│  - output (message)     │
│  - functions (array)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Show "output" to User  │
│  "Done! Class added"    │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│  Execute Functions      │
│  - add → Firebase       │
│  - delete → Firebase    │
│  - clear_all → Firebase │
│  - view → JavaScript    │
│  - view_week → JS       │
│  - view_month → JS      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Calendar Auto-Updates  │
│  (via onSnapshot for    │
│   Firebase changes)     │
└─────────────────────────┘
```

---

## 📦 JSON Configuration Structure

Your `ai-prompt-config.json` contains:

### 1. **prompt**
Base instruction for the AI agent

### 2. **context**
Dynamic values replaced at runtime:
- `{{YEAR}}` → Current selected year
- `{{SECTION}}` → Current selected section
- `{{TODAY_DATE}}` → Today's date (2025-10-10)
- `{{TODAY_DAY}}` → Today's day (Thursday)
- `{{CURRENT_SCHEDULE_DATA}}` → All classes from Firestore

### 3. **functions**
Definition of all 6 available functions with examples

### 4. **parsing_rules**
Rules for converting natural language to proper format

### 5. **response_format**
Structure and examples of how AI should respond

### 6. **instructions**
Step-by-step instructions for the AI

---

## ✅ Response Format

**STRICT FORMAT - AI MUST FOLLOW:**

```json
{
  "output": "User-friendly message",
  "functions": ["function_name('arg1','arg2','arg3')"]
}
```

### Valid Responses:

✅ **Single Function**
```json
{
  "output": "Done! Class added",
  "functions": ["add('DSA','13:00','14:00','2025-10-10')"]
}
```

✅ **Multiple Functions**
```json
{
  "output": "Added 3 classes",
  "functions": [
    "add('Math','10:00','11:00','2025-10-10')",
    "add('OOPS','10:00','11:00','2025-10-10')",
    "add('DE','10:00','11:00','2025-10-10')"
  ]
}
```

✅ **No Functions (Asking for clarification)**
```json
{
  "output": "What time do you want?",
  "functions": []
}
```

---

## 🚀 Testing Your AI Agent

### Test 1: Add Class
```
Input: "add a dsa class on today from 1:00 pm to 2:00 pm"

Expected Output:
{
  "output": "Done! DSA class added for today from 1:00 pm to 2:00 pm",
  "functions": ["add('Data Structures and Algorithm','13:00','14:00','2025-10-10')"]
}

Check:
- ✅ "DSA" expanded to full name
- ✅ "1:00 pm" converted to "13:00"
- ✅ "2:00 pm" converted to "14:00"
- ✅ "today" converted to actual date
- ✅ Function is executed
- ✅ Class appears in calendar for ALL users
```

---

## 🎯 Summary

**Your AI agent:**
1. ✅ Receives user requests
2. ✅ Gets current database context
3. ✅ Parses natural language (1pm → 13:00, DSA → full name)
4. ✅ Generates function calls
5. ✅ Returns JSON: {output, functions}
6. ✅ Backend executes functions
7. ✅ Calendar auto-updates

**All configured in `ai-prompt-config.json`**

**AI uses `ai-assistant.js` to:**
- Build complete prompt
- Send to Gemini API
- Parse JSON response
- Execute functions (Firebase or JavaScript)

---

## 📁 Files Structure

```
management/
├── config/
│   └── ai-prompt-config.json    ← AI configuration
├── scripts/
│   └── ai-assistant.js          ← AI logic + function execution
└── DYNAMIC_CALENDAR_GUIDE.md    ← System architecture guide
```

---

## 🎉 Your System is Ready!

Test it now:
1. Open your calendar page
2. Click AI assistant
3. Type: "add a dsa class on today from 1:00 pm to 2:00 pm"
4. Watch the magic happen! ✨
