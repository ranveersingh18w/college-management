# 🧪 AI Agent Testing Guide

## Quick Test Commands

### Test 1: Add DSA Class Today (1pm to 2pm)
```
User Input:
"add a dsa class on today from 1:00 pm to 2:00 pm"

Expected AI Response:
{
  "output": "Done! DSA class added for today from 1:00 pm to 2:00 pm",
  "functions": ["add('Data Structures and Algorithm','13:00','14:00','2025-10-10')"]
}

What Should Happen:
✅ AI responds with "Done! DSA class added..."
✅ Function is executed: add('Data Structures and Algorithm','13:00','14:00','2025-10-10')
✅ Console shows: "📝 Adding to Firebase: {year, section, subject...}"
✅ Console shows: "✅ Class added to Firebase"
✅ Calendar shows new DSA class at 1pm-2pm on October 10, 2025
✅ All users see the new class (open 2nd browser tab to verify)
```

---

### Test 2: Add Multiple Classes
```
User Input:
"Add Math, OOPS, DE today 10-11"

Expected AI Response:
{
  "output": "Done! Added 3 classes for today 10:00-11:00",
  "functions": [
    "add('Mathematics','10:00','11:00','2025-10-10')",
    "add('Object Oriented Programming','10:00','11:00','2025-10-10')",
    "add('Digital Electronics','10:00','11:00','2025-10-10')"
  ]
}

What Should Happen:
✅ AI responds with "Done! Added 3 classes..."
✅ 3 functions are executed
✅ Console shows 3 "📝 Adding to Firebase..." messages
✅ Calendar shows 3 classes at 10am-11am
```

---

### Test 3: Delete All Classes
```
User Input:
"Delete all classes" OR "Clear everything"

Expected AI Response:
{
  "output": "Done! Cleared all classes",
  "functions": ["clear_all()"]
}

What Should Happen:
✅ AI responds with "Done! Cleared all classes"
✅ clear_all() function is executed
✅ Console shows: "🗑️ Clearing all classes for..."
✅ Calendar becomes empty
✅ All users see empty calendar
```

---

### Test 4: View Different Year/Section
```
User Input:
"Show me 1st year section A"

Expected AI Response:
{
  "output": "Showing 1st Year, Section A",
  "functions": ["view('1st Year','Section A')"]
}

What Should Happen:
✅ AI responds with "Showing 1st Year, Section A"
✅ view() function is executed
✅ Dropdowns change to "1st Year" and "Section A"
✅ Calendar shows 1st Year Sec A schedule
✅ Other browser tabs stay unchanged (local operation)
```

---

### Test 5: Missing Information
```
User Input:
"Add Python class"

Expected AI Response:
{
  "output": "Sure! What time and date?",
  "functions": []
}

What Should Happen:
✅ AI asks for clarification
✅ No functions executed
✅ User can reply with time/date
```

---

## 🔍 Console Debugging

### Open Browser Console (F12)

**Look for these messages:**

#### When AI processes request:
```
Understanding your request...
Gemini Response: {candidates: [...]}
Raw response: {"output": "Done!", "functions": [...]}
✅ New format detected: {output: "Done!", functions: [...]}
```

#### When add() function executes:
```
🔧 Executing function: add('Data Structures and Algorithm','13:00','14:00','2025-10-10')
📋 Function: add, Args: ["Data Structures and Algorithm", "13:00", "14:00", "2025-10-10"]
📝 Adding to Firebase: {year: "Year 2", section: "A", subject: "Data Structures and Algorithm"...}
✅ Class added to Firebase
```

#### When delete() function executes:
```
🔧 Executing function: delete('DSA','*','*')
📋 Function: delete, Args: ["DSA", "*", "*"]
🗑️ Deleting from Firebase: DSA, deleteAll: true
✅ Deleted 5 classes
```

#### When view() function executes:
```
🔧 Executing function: view('1st Year','Section A')
📋 Function: view, Args: ["1st Year", "Section A"]
👁️ Changing view to: 1st Year, Section A
```

---

## ❌ Common Errors & Fixes

### Error 1: "Invalid function format"
```
❌ Error: Invalid function format: add('DSA','13:00','14:00','2025-10-10'
```
**Cause:** AI generated incomplete function (missing closing parenthesis)
**Fix:** Check AI prompt - make sure examples show complete functions

---

### Error 2: "Cannot read property 'value' of null"
```
❌ Error: Cannot read property 'value' of null
```
**Cause:** Dropdown elements not found (yearSelect or sectionSelect)
**Fix:** Check HTML - make sure elements have correct IDs: `yearSelect`, `sectionSelect`

---

### Error 3: "Firebase permission denied"
```
❌ Firebase add error: Missing or insufficient permissions
```
**Cause:** Firebase rules don't allow write access
**Fix:** Update Firebase rules to allow read/write:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // For development only!
    }
  }
}
```

---

### Error 4: "AI not responding in JSON format"
```
Raw response: Done! I've added the class.
```
**Cause:** AI is responding in plain text instead of JSON
**Fix:** Prompt is not clear enough. Updated prompt emphasizes JSON format.

---

## 🎯 Step-by-Step Testing

### 1. Open Your Calendar
```
- Navigate to unified-schedule.html
- Make sure page loads without errors
- Check console for any initialization errors
```

### 2. Open AI Assistant
```
- Click the AI chat button
- Chat panel should open on the right
- You should see welcome message
```

### 3. Test Add Function
```
Type: "add a dsa class on today from 1:00 pm to 2:00 pm"
Press Enter or click Send

Watch console:
1. "Understanding your request..." message
2. "Gemini Response:" with data
3. "✅ New format detected:"
4. "🔧 Executing function: add(...)"
5. "📝 Adding to Firebase:"
6. "✅ Class added to Firebase"

Watch calendar:
- New DSA class should appear at 1pm-2pm on today's date
```

### 4. Open Second Browser Tab
```
- Open same page in new tab
- You should see the DSA class there too (real-time sync)
- This confirms Firebase write worked and onSnapshot is active
```

### 5. Test View Function
```
In first tab, type: "Show me 1st year section A"

Watch:
- Dropdowns change to 1st Year, Sec A
- Calendar shows different schedule

In second tab:
- Dropdowns stay unchanged
- This confirms view is local-only (no Firebase write)
```

### 6. Test Delete All
```
Type: "Delete all classes" or "Clear everything"

Watch:
- Both tabs should show empty calendar
- This confirms Firebase delete worked
```

---

## 📊 Success Criteria

✅ **AI Understanding:**
- [ ] AI parses "1pm" → "13:00"
- [ ] AI expands "DSA" → "Data Structures and Algorithm"
- [ ] AI uses "today" → actual date (2025-10-10)
- [ ] AI generates correct function syntax

✅ **Function Execution:**
- [ ] add() writes to Firebase
- [ ] delete() removes from Firebase
- [ ] clear_all() deletes all classes
- [ ] view() changes dropdowns (JavaScript only)
- [ ] view_week() clicks button
- [ ] view_month() clicks button

✅ **Real-time Sync:**
- [ ] Multiple browser tabs show same data
- [ ] Changes in one tab appear in other tabs instantly
- [ ] onSnapshot listener is working

✅ **User Experience:**
- [ ] AI responds with friendly messages
- [ ] Functions execute without errors
- [ ] Calendar updates automatically
- [ ] Console shows clear debug messages

---

## 🚀 Production Checklist

Before deploying:

- [ ] Remove console.log() statements (or comment them out)
- [ ] Update Firebase rules for production security
- [ ] Test with multiple users simultaneously
- [ ] Test error handling (network errors, invalid input)
- [ ] Add loading indicators for function execution
- [ ] Add success/error toast notifications
- [ ] Test on mobile devices
- [ ] Test with slow internet connection
- [ ] Add rate limiting for AI API calls
- [ ] Monitor API usage and costs

---

## 📝 Notes

**Current Date:** October 10, 2025 (Thursday)

**Test Dates:**
- Today: 2025-10-10 (Thursday)
- Tomorrow: 2025-10-11 (Friday)
- This Week: Oct 6-12, 2025

**Subject Abbreviations to Test:**
- DSA, OOPS, DE, SE, AEM, TC

**Time Formats to Test:**
- "1pm", "2pm", "10-11", "1:00 pm to 2:00 pm"

---

## 🎉 Ready to Test!

1. Open console (F12)
2. Type test commands
3. Watch the magic happen! ✨

If something doesn't work, check:
- Console errors
- Firebase rules
- Network tab for API calls
- AI response format
