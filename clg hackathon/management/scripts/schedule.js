import { db } from './firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Check authentication
const userData = JSON.parse(localStorage.getItem('userData'));
const userId = localStorage.getItem('userId');

if (!userData || !userId) {
    window.location.href = 'index.html';
}

// Set user info
document.getElementById('user-name').textContent = userData.name;
document.getElementById('user-avatar').src = userData.photoURL;

// Logout function
window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

let currentEditId = null;
let unsubscribeVisualSchedules = null;
let unsubscribeBranchSchedules = null;

// Load all schedules with real-time updates
function loadSchedules() {
    // Setup real-time listener for visual schedules
    const visualSchedulesRef = collection(db, 'visual_schedules');
    const visualQuery = query(
        visualSchedulesRef,
        where('branch', '==', userData.branch),
        where('year', '==', userData.year)
    );
    
    // Real-time listener for visual schedules
    unsubscribeVisualSchedules = onSnapshot(visualQuery, (snapshot) => {
        const schedules = [];
        
        snapshot.forEach((doc) => {
            schedules.push({ id: doc.id, ...doc.data(), isVisual: true });
        });
        
        // Load legacy schedules and display
        loadLegacyAndDisplay(schedules);
        
        // Show notification on update
        if (snapshot.docChanges().length > 0) {
            const changes = snapshot.docChanges();
            if (changes.some(change => change.type === 'added' || change.type === 'modified')) {
                showNotification('📅 Schedule updated in real-time!', 'success');
            }
        }
    }, (error) => {
        console.error('Error in visual schedules listener:', error);
        showNotification('Error loading schedules', 'error');
    });
    
    // Also setup listener for legacy branch schedules
    setupBranchScheduleListener();
}

// Setup real-time listener for branch schedules
function setupBranchScheduleListener() {
    const schedulesRef = collection(db, 'branch_schedules');
    const q = query(
        schedulesRef,
        where('branch', '==', userData.branch),
        where('year', '==', userData.year)
    );
    
    unsubscribeBranchSchedules = onSnapshot(q, () => {
        // Reload visual schedules when branch schedules change
        // The visual schedules listener will handle the display
        console.log('Branch schedules updated');
    }, (error) => {
        console.error('Error in branch schedules listener:', error);
    });
}

// Load legacy schedules and display all
async function loadLegacyAndDisplay(visualSchedules) {
    try {
        const schedulesRef = collection(db, 'branch_schedules');
        const q = query(
            schedulesRef,
            where('branch', '==', userData.branch),
            where('year', '==', userData.year)
        );
        
        const querySnapshot = await getDocs(q);
        const allSchedules = [...visualSchedules];
        
        querySnapshot.forEach((doc) => {
            allSchedules.push({ id: doc.id, ...doc.data(), isVisual: false });
        });
        
        // Sort by day and time
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        allSchedules.sort((a, b) => {
            const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            if (dayDiff !== 0) return dayDiff;
            return a.startTime.localeCompare(b.startTime);
        });
        
        displaySchedules(allSchedules);
    } catch (error) {
        console.error('Error loading legacy schedules:', error);
    }
}

// Cleanup listeners on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeVisualSchedules) unsubscribeVisualSchedules();
    if (unsubscribeBranchSchedules) unsubscribeBranchSchedules();
});

function displaySchedules(schedules) {
    const container = document.getElementById('schedule-container');
    
    if (schedules.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <h3>No classes scheduled yet</h3>
                <p>Click "Add Class" to create your first schedule</p>
            </div>
        `;
        return;
    }
    
    // Group by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped = {};
    
    days.forEach(day => {
        grouped[day] = schedules.filter(s => s.day === day);
    });
    
    container.innerHTML = days.map(day => {
        const daySchedules = grouped[day];
        if (daySchedules.length === 0) return '';
        
        return `
            <div>
                <h2 style="margin-bottom: 15px; color: #667eea;">${day}</h2>
                ${daySchedules.map(schedule => createScheduleCard(schedule)).join('')}
            </div>
        `;
    }).join('');
}

function createScheduleCard(schedule) {
    return `
        <div class="schedule-card">
            <div class="schedule-card-header">
                <div>
                    <h3>${schedule.subject}</h3>
                    <p style="color: #666; margin-top: 5px;">👨‍🏫 ${schedule.faculty}</p>
                </div>
            </div>
            <div class="schedule-card-info">
                <div class="info-row">
                    <span>🕒</span>
                    <span>${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</span>
                </div>
                <div class="info-row">
                    <span>📍</span>
                    <span>${schedule.location}</span>
                </div>
                <div class="info-row">
                    <span>📅</span>
                    <span>${schedule.day}</span>
                </div>
            </div>
            <p style="margin-top: 15px; color: #999; font-size: 13px; text-align: center;">
                📅 Schedule managed by administration
            </p>
        </div>
    `;
}

function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Modal functions
window.openAddClassModal = function() {
    currentEditId = null;
    document.getElementById('modal-title').textContent = 'Add New Class';
    document.getElementById('class-form').reset();
    document.getElementById('class-id').value = '';
    document.getElementById('class-modal').classList.add('active');
};

window.closeClassModal = function() {
    document.getElementById('class-modal').classList.remove('active');
    currentEditId = null;
};

window.editSchedule = async function(scheduleId) {
    try {
        const scheduleDoc = await getDocs(query(collection(db, 'schedules'), where('__name__', '==', scheduleId)));
        
        scheduleDoc.forEach((doc) => {
            const schedule = doc.data();
            currentEditId = doc.id;
            
            document.getElementById('modal-title').textContent = 'Edit Class';
            document.getElementById('class-id').value = doc.id;
            document.getElementById('class-subject').value = schedule.subject;
            document.getElementById('class-faculty').value = schedule.faculty;
            document.getElementById('class-day').value = schedule.day;
            document.getElementById('class-start-time').value = schedule.startTime;
            document.getElementById('class-end-time').value = schedule.endTime;
            document.getElementById('class-location').value = schedule.location;
            
            document.getElementById('class-modal').classList.add('active');
        });
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
};

window.deleteSchedule = async function(scheduleId) {
    if (!confirm('Are you sure you want to delete this class?')) return;
    
    try {
        await deleteDoc(doc(db, 'schedules', scheduleId));
        await loadSchedules();
        alert('Class deleted successfully!');
    } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('Failed to delete class');
    }
};

window.markAttended = async function(scheduleId) {
    try {
        await updateDoc(doc(db, 'schedules', scheduleId), {
            attended: true
        });
        
        // Update user attendance stats
        const newAttendance = (userData.attendance || 0) + 1;
        const newTotal = (userData.totalClasses || 0) + 1;
        
        await updateDoc(doc(db, 'students', userId), {
            attendance: newAttendance,
            totalClasses: newTotal
        });
        
        userData.attendance = newAttendance;
        userData.totalClasses = newTotal;
        localStorage.setItem('userData', JSON.stringify(userData));
        
        await loadSchedules();
        alert('Attendance marked!');
    } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Failed to mark attendance');
    }
};

// Form submission
document.getElementById('class-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const scheduleData = {
        userId: userId,
        subject: document.getElementById('class-subject').value,
        faculty: document.getElementById('class-faculty').value,
        day: document.getElementById('class-day').value,
        startTime: document.getElementById('class-start-time').value,
        endTime: document.getElementById('class-end-time').value,
        location: document.getElementById('class-location').value,
        attended: false,
        createdAt: new Date().toISOString()
    };
    
    try {
        if (currentEditId) {
            // Update existing
            await updateDoc(doc(db, 'schedules', currentEditId), scheduleData);
            alert('Class updated successfully!');
        } else {
            // Add new
            await addDoc(collection(db, 'schedules'), scheduleData);
            alert('Class added successfully!');
        }
        
        closeClassModal();
        await loadSchedules();
    } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Failed to save class');
    }
});

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : type === 'warning' ? '#ed8936' : '#667eea'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Chatbot functions
window.openChatbot = function() {
    document.getElementById('chatbot-modal').classList.add('active');
};

window.closeChatbot = function() {
    document.getElementById('chatbot-modal').classList.remove('active');
};

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML += `
        <div class="user-message">
            <p>${message}</p>
        </div>
    `;
    
    input.value = '';
    
    setTimeout(() => {
        const response = processChatMessage(message);
        messagesContainer.innerHTML += `
            <div class="bot-message">
                <p>${response}</p>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 500);
};

function processChatMessage(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('add') && msg.includes('class')) {
        setTimeout(() => openAddClassModal(), 1000);
        return 'Sure! Opening the add class form for you...';
    }
    
    if (msg.includes('next class') || msg.includes('upcoming')) {
        return 'Check your schedule above to see all your upcoming classes for the week.';
    }
    
    if (msg.includes('today') && msg.includes('timetable')) {
        return 'You can see today\'s schedule on the home page, or check here for the full week.';
    }
    
    return 'I can help you with:\n- Adding a new class\n- Viewing your schedule\n- Managing attendance\n\nWhat would you like to do?';
}

document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Load schedules on page load
loadSchedules();
