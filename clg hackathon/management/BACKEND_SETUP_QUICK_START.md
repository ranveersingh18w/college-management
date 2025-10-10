# 🚀 Backend Integration - Quick Start

## ✅ What's Done:

### Frontend Changes:
- ✅ AI generates function calls: `add()`, `delete()`, `view()`
- ✅ `executeBackendFunction()` now calls backend APIs
- ✅ **Fallback to direct Firebase** if backend is unavailable
- ✅ Proper error handling

### Backend API Needed:
You need to create 3 endpoints in your backend

---

## 🔧 Step 1: Update Backend URL

**File:** `scripts/ai-assistant.js` (Line ~805)

```javascript
// 🔧 CHANGE THIS TO YOUR BACKEND URL
const BACKEND_BASE_URL = 'http://localhost:3000/api';

// Examples:
// Local: 'http://localhost:3000/api'
// Production: 'https://your-backend.com/api'
```

---

## 📡 Step 2: Create Backend APIs

### API 1: Add Class
**Endpoint:** `POST /api/add-class`

**Request Body:**
```json
{
  "year": "Year 2",
  "section": "A",
  "subject": "Data Structures and Algorithm",
  "faculty": "TBA",
  "startTime": "10:00",
  "endTime": "11:00",
  "date": "2025-10-10",
  "day": "Thursday"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Class added successfully",
  "classId": "abc123"
}
```

**Backend Code (Node.js Example):**
```javascript
app.post('/api/add-class', async (req, res) => {
    try {
        const { year, section, subject, faculty, startTime, endTime, date, day } = req.body;
        
        // Add to Firebase unified_schedules collection
        const classData = {
            year, section, subject,
            faculty: faculty || 'TBA',
            startTime, endTime,
            startHour: parseInt(startTime.split(':')[0]),
            endHour: parseInt(endTime.split(':')[0]),
            date, day,
            createdAt: new Date().toISOString()
        };
        
        const docRef = await db.collection('unified_schedules').add(classData);
        
        res.json({
            success: true,
            message: 'Class added successfully',
            classId: docRef.id
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
```

---

### API 2: Delete Class
**Endpoint:** `POST /api/delete-class`

**Request Body (Delete All):**
```json
{
  "year": "Year 2",
  "section": "A",
  "subject": "DSA",
  "deleteAll": true
}
```

**Request Body (Delete Specific):**
```json
{
  "year": "Year 2",
  "section": "A",
  "subject": "DSA",
  "deleteAll": false,
  "date": "2025-10-10",
  "time": "10:00"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deleted 5 classes",
  "count": 5
}
```

**Backend Code (Node.js Example):**
```javascript
app.post('/api/delete-class', async (req, res) => {
    try {
        const { year, section, subject, deleteAll, date, time } = req.body;
        
        // Build query
        let query = db.collection('unified_schedules')
            .where('year', '==', year)
            .where('section', '==', section)
            .where('subject', '==', subject);
        
        if (!deleteAll && date) {
            query = query.where('date', '==', date);
            if (time) {
                query = query.where('startTime', '==', time);
            }
        }
        
        const snapshot = await query.get();
        
        // Delete in batch
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        res.json({
            success: true,
            message: `Deleted ${snapshot.size} classes`,
            count: snapshot.size
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
```

---

### API 3: View Schedule
**Endpoint:** `GET /api/view-schedule`

**Query Parameters:**
- `date=2025-10-10`
- `year=Year 2`
- `section=A`

**Response:**
```json
{
  "success": true,
  "classes": [
    {
      "subject": "DSA",
      "faculty": "Dr. Smith",
      "startTime": "10:00",
      "endTime": "11:00"
    },
    {
      "subject": "OOPS",
      "faculty": "Dr. Kumar",
      "startTime": "11:00",
      "endTime": "12:00"
    }
  ]
}
```

**Backend Code (Node.js Example):**
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
        
        res.json({ success: true, classes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
```

---

## 🔥 Step 3: Firebase Admin Setup (Backend)

### Install Firebase Admin:
```bash
npm install firebase-admin
```

### Initialize Firebase Admin:
```javascript
const admin = require('firebase-admin');

// Download service account key from Firebase Console
// Project Settings → Service Accounts → Generate New Private Key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
```

### Get Service Account Key:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **campusgeofence**
3. Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save as `serviceAccountKey.json` in your backend folder

---

## 🧪 Testing

### With Backend Running:
```
1. Start your backend: node server.js (or python app.py)
2. Update BACKEND_BASE_URL in ai-assistant.js
3. Open AI chat
4. Type: "Add DSA 10-11 for today"
5. Check console: Should show "📤 POST /api/add-class"
6. Class should appear in calendar ✅
```

### Without Backend (Fallback):
```
1. Don't start backend
2. Open AI chat
3. Type: "Add DSA 10-11 for today"
4. Check console: Shows "⚠️ Falling back to direct Firebase..."
5. Class still works (direct Firebase) ✅
```

---

## 📊 Database Structure

**Collection:** `unified_schedules`

**Document Structure:**
```javascript
{
  id: "auto-generated-by-firebase",
  year: "Year 2",
  section: "A",
  subject: "Data Structures and Algorithm",
  faculty: "Dr. Smith",
  startTime: "10:00",
  endTime: "11:00",
  startHour: 10,
  endHour: 11,
  date: "2025-10-10",
  day: "Thursday",
  createdAt: "2025-10-10T03:49:37.756Z"
}
```

---

## 🎯 Flow Diagram

```
User: "Add DSA 10-11 for today"
    ↓
AI Generates: add('DSA','10:00','11:00','2025-10-10')
    ↓
executeBackendFunction() parses it
    ↓
callAddAPI() → POST /api/add-class
    ↓
Backend → Firebase → unified_schedules
    ↓
Frontend refreshes calendar
    ↓
✅ Class appears!
```

---

## 🔍 Console Logs to Check

### Successful Backend Call:
```
🔧 Calling backend API: add('DSA','10:00','11:00','2025-10-10')
📋 Function: add, Args: ['DSA', '10:00', '11:00', '2025-10-10']
📤 POST /api/add-class: {year: "Year 2", section: "A", ...}
✅ Backend response: {success: true, message: "Class added successfully"}
```

### Backend Not Available (Fallback):
```
🔧 Calling backend API: add('DSA','10:00','11:00','2025-10-10')
📋 Function: add, Args: ['DSA', '10:00', '11:00', '2025-10-10']
📤 POST /api/add-class: {year: "Year 2", section: "A", ...}
❌ Network error: Failed to fetch
⚠️ Falling back to direct Firebase...
🎯 executeAddClass called with args: {...}
✅ 📚 Added 1 class(es)!
```

---

## ✅ Summary

### What You Have:
✅ Frontend ready to call backend APIs  
✅ Fallback to Firebase if backend unavailable  
✅ Proper error handling  
✅ Complete documentation  

### What You Need to Do:
1. Create backend server (Node.js/Python/PHP)
2. Implement 3 API endpoints (add, delete, view)
3. Setup Firebase Admin SDK
4. Update `BACKEND_BASE_URL` in code
5. Deploy and test!

**Backend banane ke baad, simply URL change karo aur kaam karega! 🚀**
