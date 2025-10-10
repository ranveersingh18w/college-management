# 🔧 Backend Integration Guide

## 📊 Current Setup

### Firebase Database:
- **Collection:** `unified_schedules`
- **Project:** campusgeofence
- **Config:** Already in `scripts/firebase.js`

### Data Structure:
```javascript
{
  id: "auto-generated",
  year: "Year 2",
  section: "A",
  date: "2025-10-08",
  day: "Wednesday",
  subject: "SE Lab",
  faculty: "Dr. Naresh",
  startTime: "14:00",
  endTime: "15:00",
  startHour: 14,
  endHour: 15,
  createdAt: "2025-10-10T03:49:37.756Z"
}
```

---

## 🎯 Backend API Required

### You need to create 3 API endpoints:

### 1️⃣ **POST /api/add-class**
```javascript
// Request Body:
{
  "year": "Year 2",
  "section": "A",
  "subject": "Data Structures and Algorithm",
  "faculty": "TBA",  // optional
  "startTime": "10:00",
  "endTime": "11:00",
  "date": "2025-10-10",
  "day": "Thursday"
}

// Response:
{
  "success": true,
  "message": "Class added successfully",
  "classId": "abc123"
}
```

### 2️⃣ **POST /api/delete-class**
```javascript
// Delete specific class:
{
  "subject": "DSA",
  "date": "2025-10-10",
  "time": "10:00"
}

// OR Delete all classes of a subject:
{
  "subject": "DSA",
  "deleteAll": true
}

// Response:
{
  "success": true,
  "message": "Deleted 5 classes",
  "count": 5
}
```

### 3️⃣ **GET /api/view-schedule**
```javascript
// Query parameters:
?date=2025-10-10
?year=Year 2&section=A

// Response:
{
  "success": true,
  "classes": [
    {
      "subject": "DSA",
      "startTime": "10:00",
      "endTime": "11:00",
      "faculty": "Dr. Smith"
    }
  ]
}
```

---

## 🔄 How to Modify AI Agent

### Current Flow:
```
User → AI → Direct Firebase → Calendar Updates
```

### New Flow (Backend):
```
User → AI → Backend API → Firebase → Calendar Updates
```

---

## 📝 Changes Needed in `ai-assistant.js`

### Replace `executeBackendFunction()`:

```javascript
// OLD CODE (Direct Firebase):
async function executeBackendFunction(funcStr) {
    // Parses and directly calls Firebase
    await executeAddClass({...});
    await executeDeleteClass({...});
}

// NEW CODE (Backend API):
async function executeBackendFunction(funcStr) {
    console.log('🔧 Calling backend API:', funcStr);
    
    try {
        // Parse function string
        const match = funcStr.match(/^(\w+)\((.*)\)$/);
        const funcName = match[1];
        const argsStr = match[2];
        
        // Parse arguments
        const args = parseArguments(argsStr);
        
        // Call appropriate backend API
        if (funcName === 'add') {
            await callAddAPI(args);
        } else if (funcName === 'delete') {
            await callDeleteAPI(args);
        } else if (funcName === 'view') {
            await callViewAPI(args);
        }
        
    } catch (error) {
        console.error('❌ Backend API error:', error);
        addMessageToChat('bot', '❌ Error: ' + error.message);
    }
}

// Add Class API Call
async function callAddAPI(args) {
    const [subject, startTime, endTime, date] = args;
    
    // Calculate day from date
    const dateObj = new Date(date);
    const day = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    const requestBody = {
        year: currentYear,
        section: currentSection,
        subject: subject,
        faculty: "TBA",
        startTime: startTime,
        endTime: endTime,
        date: date,
        day: day
    };
    
    console.log('📤 Sending to backend:', requestBody);
    
    const response = await fetch('YOUR_BACKEND_URL/api/add-class', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.success) {
        addMessageToChat('bot', `✅ ${data.message}`);
        // Refresh calendar
        if (typeof window.loadScheduleData === 'function') {
            window.loadScheduleData();
        }
    } else {
        addMessageToChat('bot', `❌ ${data.message}`);
    }
}

// Delete Class API Call
async function callDeleteAPI(args) {
    const [subject, date, time] = args;
    
    const requestBody = {
        year: currentYear,
        section: currentSection,
        subject: subject,
        deleteAll: (date === '*' || !date)
    };
    
    if (!requestBody.deleteAll) {
        requestBody.date = date;
        requestBody.time = time;
    }
    
    console.log('📤 Sending to backend:', requestBody);
    
    const response = await fetch('YOUR_BACKEND_URL/api/delete-class', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.success) {
        addMessageToChat('bot', `✅ Deleted ${data.count} class(es)!`);
        // Refresh calendar
        if (typeof window.loadScheduleData === 'function') {
            window.loadScheduleData();
        }
    } else {
        addMessageToChat('bot', `❌ ${data.message}`);
    }
}

// View Schedule API Call
async function callViewAPI(args) {
    const [date] = args;
    
    console.log('📤 Fetching schedule for:', date);
    
    const response = await fetch(
        `YOUR_BACKEND_URL/api/view-schedule?date=${date}&year=${currentYear}&section=${currentSection}`
    );
    
    const data = await response.json();
    
    if (data.success) {
        let message = `📅 Schedule for ${date}:\n\n`;
        data.classes.forEach(cls => {
            message += `• ${cls.startTime}-${cls.endTime}: ${cls.subject}`;
            if (cls.faculty !== 'TBA') message += ` (${cls.faculty})`;
            message += '\n';
        });
        addMessageToChat('bot', message);
    } else {
        addMessageToChat('bot', '❌ No classes found');
    }
}

// Helper to parse function arguments
function parseArguments(argsStr) {
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
    
    return args;
}
```

---

## 🚀 Complete Backend Integration Steps

### Step 1: Create Backend Server
Choose one:
- Node.js + Express
- Python + Flask/FastAPI
- PHP
- Any other backend

### Step 2: Install Firebase Admin SDK
```bash
# For Node.js:
npm install firebase-admin

# For Python:
pip install firebase-admin
```

### Step 3: Initialize Firebase Admin
```javascript
// Node.js Example:
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
```

### Step 4: Create API Endpoints

**Add Class Endpoint:**
```javascript
app.post('/api/add-class', async (req, res) => {
    try {
        const { year, section, subject, faculty, startTime, endTime, date, day } = req.body;
        
        const classData = {
            year,
            section,
            subject,
            faculty: faculty || 'TBA',
            startTime,
            endTime,
            startHour: parseInt(startTime.split(':')[0]),
            endHour: parseInt(endTime.split(':')[0]),
            date,
            day,
            createdAt: new Date().toISOString()
        };
        
        const docRef = await db.collection('unified_schedules').add(classData);
        
        res.json({
            success: true,
            message: 'Class added successfully',
            classId: docRef.id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
```

**Delete Class Endpoint:**
```javascript
app.post('/api/delete-class', async (req, res) => {
    try {
        const { year, section, subject, deleteAll, date, time } = req.body;
        
        let query = db.collection('unified_schedules')
            .where('year', '==', year)
            .where('section', '==', section)
            .where('subject', '==', subject);
        
        if (!deleteAll && date) {
            query = query.where('date', '==', date);
        }
        
        const snapshot = await query.get();
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        res.json({
            success: true,
            message: `Deleted ${snapshot.size} classes`,
            count: snapshot.size
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
```

**View Schedule Endpoint:**
```javascript
app.get('/api/view-schedule', async (req, res) => {
    try {
        const { date, year, section } = req.query;
        
        const snapshot = await db.collection('unified_schedules')
            .where('year', '==', year)
            .where('section', '==', section)
            .where('date', '==', date)
            .orderBy('startTime')
            .get();
        
        const classes = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                subject: data.subject,
                faculty: data.faculty,
                startTime: data.startTime,
                endTime: data.endTime
            };
        });
        
        res.json({
            success: true,
            classes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
```

### Step 5: Deploy Backend
- Deploy to Heroku, Vercel, Railway, etc.
- Get your backend URL: `https://your-backend.com`

### Step 6: Update Frontend
Replace `'YOUR_BACKEND_URL'` in the code above with your actual backend URL.

---

## 🧪 Testing Flow

### Test 1: Add Class
```
1. User types: "Add DSA 10-11 for today"
2. AI generates: add('DSA','10:00','11:00','2025-10-10')
3. Frontend calls: POST https://your-backend.com/api/add-class
4. Backend adds to Firebase
5. Frontend refreshes calendar
6. Class appears ✅
```

### Test 2: Delete All
```
1. User types: "Delete all classes"
2. AI checks database, generates:
   delete('DSA','*','*')
   delete('OOPS','*','*')
3. Frontend calls backend for each
4. Backend deletes from Firebase
5. Calendar empties ✅
```

---

## 📊 Summary

### Current System:
✅ Firebase config: Already set up  
✅ Database: `unified_schedules` collection  
✅ AI: Generates function calls  
❌ Direct Firebase access (needs to change)  

### What You Need:
1. Create backend server (Node.js/Python/PHP)
2. Install Firebase Admin SDK
3. Create 3 API endpoints (add, delete, view)
4. Deploy backend
5. Update frontend to call backend APIs

### Files to Modify:
- `scripts/ai-assistant.js` → Replace `executeBackendFunction()`
- Add backend URL configuration
- Keep AI prompt logic same (generates functions)

**AI ka kaam same rahega - sirf execution backend se hoga! 🚀**
