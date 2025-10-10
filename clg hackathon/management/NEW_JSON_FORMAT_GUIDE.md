# 🎯 New JSON Format - Complete Guide

## 📋 Overview

Your AI agent now uses a **simple, clean JSON format** where Gemini returns:
- `output`: User-friendly message
- `functions`: Array of backend function calls

---

## 🔧 JSON Configuration Structure

### File: `config/ai-prompt-config.json`

```json
{
  "prompt": "You are an AI Schedule Manager...",
  "data": "{{CURRENT_SCHEDULE_DATA}}",
  "functions": {
    "add": {...},
    "delete": {...},
    "view": {...}
  },
  "extra": {
    "context": {...},
    "rules": [...],
    "response_format": {...}
  }
}
```

---

## ⚡ Available Functions

### 1. `add(subject, startTime, endTime, date)`
**Purpose:** Add a class to schedule

**Example:**
```javascript
"add('Data Structures and Algorithm', '10:00', '11:00', '2025-10-10')"
```

### 2. `delete(subject, date, time)`
**Purpose:** Delete a class from schedule

**Examples:**
```javascript
// Delete specific instance
"delete('DSA', '2025-10-10', '09:00')"

// Delete ALL instances of subject
"delete('DSA', '*', '*')"
```

### 3. `view(date)`
**Purpose:** View schedule for a specific date

**Example:**
```javascript
"view('2025-10-10')"
```

---

## 🎯 Response Format

### Structure:
```json
{
  "output": "User-friendly message",
  "functions": ["add(...)", "delete(...)", "view(...)"]
}
```

### Examples:

#### Example 1: Single Add
**User:** "Add DSA 10-11 for today"

**AI Response:**
```json
{
  "output": "Done! DSA class added for today 10:00-11:00",
  "functions": ["add('Data Structures and Algorithm','10:00','11:00','2025-10-10')"]
}
```

**What happens:**
1. User sees: "Done! DSA class added for today 10:00-11:00"
2. Backend executes: `add('Data Structures and Algorithm','10:00','11:00','2025-10-10')`
3. Class appears in calendar ✅

---

#### Example 2: Multiple Add
**User:** "Add DSA, OOPS, DE for today 9-10"

**AI Response:**
```json
{
  "output": "Done! Added 3 classes for today 9:00-10:00",
  "functions": [
    "add('Data Structures and Algorithm','09:00','10:00','2025-10-10')",
    "add('Object Oriented Programming','09:00','10:00','2025-10-10')",
    "add('Digital Electronics','09:00','10:00','2025-10-10')"
  ]
}
```

**What happens:**
1. User sees: "Done! Added 3 classes for today 9:00-10:00"
2. Backend executes all 3 add functions
3. Console shows: `🔄 Executing 3 function(s)...`
4. All 3 classes appear in calendar ✅

---

#### Example 3: Delete All
**User:** "Delete all classes"

**Database has:** DSA (5 classes), OOPS (3 classes), SE Lab (2 classes)

**AI Response:**
```json
{
  "output": "Done! Deleted all classes",
  "functions": [
    "delete('Data Structures and Algorithm','*','*')",
    "delete('Object Oriented Programming','*','*')",
    "delete('SE Lab','*','*')"
  ]
}
```

**What happens:**
1. User sees: "Done! Deleted all classes"
2. Backend executes 3 delete functions
3. All DSA (5) + OOPS (3) + SE Lab (2) = 10 classes deleted
4. Calendar is empty ✅

---

#### Example 4: Missing Information
**User:** "Add Python class"

**AI Response:**
```json
{
  "output": "Sure! What time and date?",
  "functions": []
}
```

**What happens:**
1. User sees: "Sure! What time and date?"
2. No functions executed (empty array)
3. User can reply: "10-11 for today"
4. AI remembers "Python class" from conversation history

---

#### Example 5: View Schedule
**User:** "Show today's schedule"

**AI Response:**
```json
{
  "output": "Here's today's schedule",
  "functions": ["view('2025-10-10')"]
}
```

**What happens:**
1. User sees: "Here's today's schedule"
2. Backend executes: `view('2025-10-10')`
3. Schedule query displays all classes for today

---

## 🔍 How It Works (Backend)

### Step 1: User sends message
```
User: "Add DSA, OOPS for today 10-11"
```

### Step 2: Build prompt with data
```javascript
const prompt = `
You are an AI Schedule Manager...

📊 DATA (Current Schedule):
Total Classes: 5
Year: Year 2, Section: A

📅 **09/10/2025 (Monday):**
   • 09:00-10:00: Math (Dr. Kumar)
...

⚡ FUNCTIONS YOU CAN USE:
1. add(subject, startTime, endTime, date)
2. delete(subject, date, time)
3. view(date)

📝 CONTEXT:
- Today: 10/10/2025 (Thursday)
- Year: Year 2
- Section: A

USER REQUEST: "Add DSA, OOPS for today 10-11"
`;
```

### Step 3: Gemini analyzes and responds
```json
{
  "output": "Done! Added 2 classes for today 10:00-11:00",
  "functions": [
    "add('Data Structures and Algorithm','10:00','11:00','2025-10-10')",
    "add('Object Oriented Programming','10:00','11:00','2025-10-10')"
  ]
}
```

### Step 4: Parse and execute
```javascript
// Show output to user
addMessageToChat('bot', "Done! Added 2 classes for today 10:00-11:00");

// Execute functions
for (const funcStr of functions) {
    await executeBackendFunction(funcStr);
}

// Console logs:
// 🔧 Parsing function: add('Data Structures and Algorithm','10:00','11:00','2025-10-10')
// 📋 Function: add, Args: ['Data Structures and Algorithm', '10:00', '11:00', '2025-10-10']
// 🎯 executeAddClass called with args: {...}
// ✅ 📚 Added 1 class(es)!
```

---

## 📊 Data Integration

### AI Sees Complete Database
```javascript
// Fetched from Firestore
const scheduleData = [
  {date: '09/10/2025', day: 'Monday', subject: 'DSA', startTime: '09:00', endTime: '10:00'},
  {date: '09/10/2025', day: 'Monday', subject: 'OOPS', startTime: '11:00', endTime: '12:00'},
  // ... more classes
];

// Formatted for Gemini
📊 CURRENT DATABASE:
Total Classes: 5
Year: Year 2, Section: A

📅 **09/10/2025 (Monday):**
   • 09:00-10:00: DSA
   • 11:00-12:00: OOPS
...
```

**Benefits:**
- AI knows what classes exist
- Can answer "show schedule" without database query
- Can intelligently delete "all classes"
- Can detect conflicts

---

## 🧪 Test Scenarios

### Test 1: Batch Add
```
Input: "Add DSA at 9-10, OOPS at 10-11, Math at 11-12 for today"

Expected Response:
{
  "output": "Done! Added 3 classes for today",
  "functions": [
    "add('Data Structures and Algorithm','09:00','10:00','2025-10-10')",
    "add('Object Oriented Programming','10:00','11:00','2025-10-10')",
    "add('Mathematics','11:00','12:00','2025-10-10')"
  ]
}

Result: ✅ 3 classes appear in calendar
```

### Test 2: Smart Delete All
```
Input: "Delete all classes"

Database: DSA (3 instances), OOPS (2 instances)

Expected Response:
{
  "output": "Done! Deleted all classes",
  "functions": [
    "delete('Data Structures and Algorithm','*','*')",
    "delete('Object Oriented Programming','*','*')"
  ]
}

Result: ✅ All 5 classes deleted
```

### Test 3: Natural Language Parsing
```
Input: "Add Python lab 2pm to 3pm for next 5 days"

Expected Response:
{
  "output": "Done! Added Python lab for next 5 days",
  "functions": [
    "add('Python Lab','14:00','15:00','2025-10-10')",
    "add('Python Lab','14:00','15:00','2025-10-11')",
    "add('Python Lab','14:00','15:00','2025-10-12')",
    "add('Python Lab','14:00','15:00','2025-10-13')",
    "add('Python Lab','14:00','15:00','2025-10-14')"
  ]
}

Result: ✅ 5 classes added for consecutive days
```

### Test 4: Clarification Request
```
Input: "Add DSA class"

Expected Response:
{
  "output": "Sure! What time and date?",
  "functions": []
}

Follow-up Input: "10-11 for next 3 days"

Expected Response:
{
  "output": "Done! Added DSA for next 3 days 10:00-11:00",
  "functions": [
    "add('Data Structures and Algorithm','10:00','11:00','2025-10-10')",
    "add('Data Structures and Algorithm','10:00','11:00','2025-10-11')",
    "add('Data Structures and Algorithm','10:00','11:00','2025-10-12')"
  ]
}

Result: ✅ AI remembers "DSA" from conversation history
```

---

## 🎨 User Experience Flow

### Happy Path:
```
1. User: "Add DSA, OOPS for today 10-11"
2. AI shows: "Done! Added 2 classes for today 10:00-11:00"
3. Calendar updates instantly with 2 classes
4. User sees changes immediately
```

### Clarification Path:
```
1. User: "Add Python class"
2. AI shows: "Sure! What time and date?"
3. User: "2pm, for next week"
4. AI shows: "Done! Added Python class for next week 14:00-15:00"
5. Calendar updates with 7 classes (one per day)
```

### Delete All Path:
```
1. User: "Delete all classes"
2. AI checks database (sees DSA, OOPS, Math)
3. AI shows: "Done! Deleted all classes"
4. Backend deletes all subjects
5. Calendar becomes empty
```

---

## 🔧 Function Parsing Logic

### `executeBackendFunction(funcStr)`

```javascript
// Input: "add('DSA','10:00','11:00','2025-10-10')"

// Step 1: Extract function name and args string
const match = funcStr.match(/^(\w+)\((.*)\)$/);
// funcName = "add"
// argsStr = "'DSA','10:00','11:00','2025-10-10'"

// Step 2: Parse arguments (handle quotes)
const args = ["DSA", "10:00", "11:00", "2025-10-10"];

// Step 3: Route to appropriate executor
if (funcName === 'add') {
    executeAddClass({
        subject: args[0],
        startTime: args[1],
        endTime: args[2],
        startDate: args[3],
        endDate: args[3],
        days: []
    });
}
```

---

## 📈 Advantages of New Format

| Feature | Old System | New System |
|---------|-----------|------------|
| **User Output** | Mixed with technical details | Clean, user-friendly |
| **Backend Commands** | Complex JSON objects | Simple function strings |
| **Readability** | `{"action":"add_class","params":{...}}` | `add('DSA','10:00','11:00','2025-10-10')` |
| **Parsing** | JSON.parse() | Regex + split |
| **Debugging** | Hard to trace | Easy to see function calls |
| **Flexibility** | Rigid structure | Simple string format |

---

## 🎉 Summary

### What User Types:
```
"Add DSA, OOPS, DE for today 10-11"
```

### What Gemini Sees:
```
You are an AI Schedule Manager...
📊 DATA: [all current classes]
⚡ FUNCTIONS: add(), delete(), view()
📝 CONTEXT: Today is 10/10/2025, Year 2, Section A

USER REQUEST: "Add DSA, OOPS, DE for today 10-11"
```

### What Gemini Returns:
```json
{
  "output": "Done! Added 3 classes for today 10:00-11:00",
  "functions": [
    "add('Data Structures and Algorithm','10:00','11:00','2025-10-10')",
    "add('Object Oriented Programming','10:00','11:00','2025-10-10')",
    "add('Digital Electronics','10:00','11:00','2025-10-10')"
  ]
}
```

### What User Sees:
```
"Done! Added 3 classes for today 10:00-11:00"
```

### What Backend Executes:
```javascript
executeBackendFunction("add('Data Structures and Algorithm','10:00','11:00','2025-10-10')");
executeBackendFunction("add('Object Oriented Programming','10:00','11:00','2025-10-10')");
executeBackendFunction("add('Digital Electronics','10:00','11:00','2025-10-10')");
```

### What Calendar Shows:
```
✅ 3 new classes appear instantly
```

---

## 🚀 Ready to Test!

Open the AI chat and try:
1. **"Add DSA, OOPS, DE for today 10-11"** → Should add 3 classes
2. **"Delete all classes"** → Should delete all subjects found in database
3. **"Show today's schedule"** → Should display classes
4. **"Add Python class"** → Should ask for time/date

**Your AI agent is now production-ready! 🎊**
