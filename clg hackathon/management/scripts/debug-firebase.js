// Quick Firebase Data Checker
// Open console (F12) and paste this to check what's in your database

import { db } from './firebase.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

async function checkFirebaseData() {
    console.log('🔍 Checking Firebase Data...\n');
    
    // Check all schedules
    const q = query(collection(db, 'unified_schedules'));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Total documents in unified_schedules: ${snapshot.size}\n`);
    
    if (snapshot.size === 0) {
        console.log('❌ No data found in database!');
        return;
    }
    
    // Group by date
    const byDate = {};
    snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date;
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push({
            subject: data.subject,
            time: `${data.startTime}-${data.endTime}`,
            day: data.day,
            year: data.year,
            section: data.section
        });
    });
    
    // Print organized data
    Object.keys(byDate).sort().forEach(date => {
        console.log(`📅 ${date}:`);
        byDate[date].forEach(cls => {
            console.log(`   • ${cls.subject} (${cls.time}) - ${cls.day} - Year ${cls.year}, Section ${cls.section}`);
        });
        console.log('');
    });
    
    // Check current week (Oct 6-12, 2025)
    console.log('\n🎯 Classes for current week (Oct 6-12, 2025):');
    const currentWeekDates = [
        '2025-10-06', '2025-10-07', '2025-10-08', 
        '2025-10-09', '2025-10-10', '2025-10-11', '2025-10-12'
    ];
    
    currentWeekDates.forEach(date => {
        if (byDate[date]) {
            console.log(`   ${date}: ${byDate[date].length} classes`);
        } else {
            console.log(`   ${date}: 0 classes ❌`);
        }
    });
}

// Run the check
checkFirebaseData().catch(console.error);

// Export for manual use
window.checkFirebaseData = checkFirebaseData;
console.log('✅ Data checker loaded! Run: checkFirebaseData()');
