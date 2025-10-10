import { db } from './firebase.js';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    orderBy,
    limit,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initChatbot } from './chatbot.js';

// Check authentication
const userData = JSON.parse(localStorage.getItem('userData'));
const userId = localStorage.getItem('userId');

if (!userData || !userId) {
    window.location.href = 'index.html';
}

// Set user info
document.getElementById('student-name').textContent = userData.name;
document.getElementById('user-name').textContent = userData.name;
document.getElementById('user-avatar').src = userData.photoURL;

// Logout function
window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

// Real-time listeners (unsubscribe functions)
let unsubscribeSchedules = null;
let unsubscribeEvents = null;
let unsubscribeBuses = null;

// Load dashboard data with real-time updates
function loadDashboard() {
    // Setup real-time schedule listener
    setupScheduleListener();
    
    // Setup real-time events listener
    setupEventsListener();
    
    // Setup real-time bus listener
    setupBusListener();
    
    // Load other dashboard data
    loadReminders();
    loadAITip();
}

// Real-time schedule updates
function setupScheduleListener() {
    const todayDate = new Date();
    const dateStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const today = todayDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    const schedules = [];
    
    // Listen to visual schedules
    const visualSchedulesRef = collection(db, 'visual_schedules');
    const visualQuery = query(
        visualSchedulesRef, 
        where('branch', '==', userData.branch),
        where('year', '==', userData.year),
        where('date', '==', dateStr)
    );
    
    // Real-time listener for visual schedules
    const unsubVisual = onSnapshot(visualQuery, (snapshot) => {
        schedules.length = 0; // Clear array
        
        snapshot.forEach((doc) => {
            schedules.push({ id: doc.id, ...doc.data(), isVisual: true });
        });
        
        // Also load legacy schedules
        loadLegacySchedules(schedules, today);
    }, (error) => {
        console.error('Error in visual schedules listener:', error);
        showNotification('Schedule update failed', 'error');
    });
    
    unsubscribeSchedules = unsubVisual;
}

// Load legacy schedules and update UI
async function loadLegacySchedules(visualSchedules, today) {
    try {
        const schedulesRef = collection(db, 'branch_schedules');
        const q = query(
            schedulesRef, 
            where('branch', '==', userData.branch),
            where('year', '==', userData.year),
            where('day', '==', today)
        );
        
        const querySnapshot = await getDocs(q);
        const allSchedules = [...visualSchedules];
        
        querySnapshot.forEach((doc) => {
            allSchedules.push({ id: doc.id, ...doc.data(), isVisual: false });
        });
        
        // Sort by time
        allSchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // Update classes count with animation
        const classesCountEl = document.getElementById('classes-count');
        classesCountEl.style.animation = 'pulse 0.5s';
        classesCountEl.textContent = `${allSchedules.length} Classes`;
        setTimeout(() => classesCountEl.style.animation = '', 500);
        
        if (allSchedules.length > 0) {
            const classList = allSchedules.map(s => s.subject).slice(0, 3).join(', ');
            document.getElementById('classes-list').textContent = classList;
            
            // Find next class
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const nextClass = allSchedules.find(s => s.startTime > currentTime);
            
            if (nextClass) {
                document.getElementById('next-class-time').textContent = formatTime(nextClass.startTime);
                document.getElementById('next-class-details').textContent = `${nextClass.subject} - ${nextClass.location || 'TBA'}`;
            }
        } else {
            document.getElementById('classes-list').textContent = 'No classes today';
            document.getElementById('next-class-details').textContent = 'No upcoming classes';
        }
        
        // Display schedule
        displaySchedule(allSchedules);
        
        // Calculate and display attendance
        const attendancePercent = calculateAttendance();
        document.getElementById('attendance-percent').textContent = attendancePercent + '%';
        
        // Show update notification
        if (allSchedules.length > 0) {
            showNotification('📅 Schedule updated!', 'info');
        }
    } catch (error) {
        console.error('Error loading legacy schedules:', error);
    }
}

// Real-time events listener
function setupEventsListener() {
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(eventsRef, orderBy('date', 'asc'), limit(5));
    
    unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
        const events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        updateEventsDisplay(events);
        showNotification('🎉 Events updated!', 'info');
    }, (error) => {
        console.error('Error in events listener:', error);
    });
}

// Real-time bus routes listener
function setupBusListener() {
    const busRef = collection(db, 'bus_routes');
    
    unsubscribeBuses = onSnapshot(busRef, (snapshot) => {
        const routes = [];
        snapshot.forEach((doc) => {
            routes.push({ id: doc.id, ...doc.data() });
        });
        
        updateBusDisplay(routes);
        showNotification('🚌 Bus routes updated!', 'info');
    }, (error) => {
        console.error('Error in bus listener:', error);
    });
}

// Update events display
function updateEventsDisplay(events) {
    // Update events count or UI if needed
    console.log('Events updated:', events.length);
}

// Update bus display
function updateBusDisplay(routes) {
    // Update bus routes if displayed on home
    console.log('Bus routes updated:', routes.length);
}

// Cleanup listeners on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeSchedules) unsubscribeSchedules();
    if (unsubscribeEvents) unsubscribeEvents();
    if (unsubscribeBuses) unsubscribeBuses();
});

function displaySchedule(schedules) {
    const container = document.getElementById('today-schedule');
    
    if (schedules.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center;">No classes scheduled for today</p>';
        return;
    }
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    container.innerHTML = schedules.map(schedule => {
        const isPast = schedule.endTime < currentTime;
        const isCurrent = schedule.startTime <= currentTime && schedule.endTime >= currentTime;
        const statusClass = isPast ? 'done' : (isCurrent ? 'next' : '');
        const statusText = isPast ? 'Done' : (isCurrent ? 'Next' : '');
        
        return `
            <div class="schedule-item">
                <div class="schedule-time">${formatTime(schedule.startTime)}</div>
                <div class="schedule-details">
                    <h4>${schedule.subject}</h4>
                    <p>${schedule.faculty} • ${schedule.location}</p>
                </div>
                ${statusText ? `<span class="schedule-status ${statusClass}">${statusText}</span>` : ''}
            </div>
        `;
    }).join('');
}

function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function calculateAttendance() {
    if (userData.totalClasses === 0) return 85; // Default
    return Math.round((userData.attendance / userData.totalClasses) * 100);
}

async function loadReminders() {
    const container = document.getElementById('reminders-list');
    
    // Get upcoming classes in next 30 minutes
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const futureTime = new Date(now.getTime() + 30 * 60000);
    const futureTimeStr = `${String(futureTime.getHours()).padStart(2, '0')}:${String(futureTime.getMinutes()).padStart(2, '0')}`;
    
    try {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const schedulesRef = collection(db, 'schedules');
        const q = query(
            schedulesRef,
            where('userId', '==', userId),
            where('day', '==', today)
        );
        
        const querySnapshot = await getDocs(q);
        const upcomingClasses = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.startTime > currentTime && data.startTime <= futureTimeStr) {
                upcomingClasses.push(data);
            }
        });
        
        if (upcomingClasses.length > 0) {
            container.innerHTML = upcomingClasses.map(cls => 
                `<div class="reminder-item">
                    🔔 ${cls.subject} starts at ${formatTime(cls.startTime)} in ${cls.location}
                </div>`
            ).join('');
        } else {
            container.innerHTML = '<div class="reminder-item">📅 No upcoming reminders</div>';
        }
    } catch (error) {
        console.error('Error loading reminders:', error);
        container.innerHTML = '<div class="reminder-item">📅 No upcoming reminders</div>';
    }
}

function loadAITip() {
    const tips = [
        "💡 Tip: Review your notes within 24 hours for better retention!",
        "🧠 Take a 5-minute break every hour to improve focus and productivity.",
        "📚 Create a study schedule and stick to it for consistent learning.",
        "🎯 Set small, achievable goals for each study session.",
        "💪 Stay hydrated and get enough sleep for optimal brain function.",
        "📝 Use the Pomodoro Technique: 25 minutes of focused work, 5 minutes break.",
        "🌟 Practice active recall by testing yourself on the material.",
        "🔄 Mix different subjects in your study sessions for better learning.",
        "🎨 Use visual aids like mind maps and diagrams to understand complex topics.",
        "👥 Study in groups occasionally to gain different perspectives."
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    document.getElementById('ai-tip').innerHTML = `<p>${randomTip}</p>`;
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
    
    // Add user message
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML += `
        <div class="user-message">
            <p>${message}</p>
        </div>
    `;
    
    input.value = '';
    
    // Process message and get response
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
    
    if (msg.includes('next class') || msg.includes('upcoming class')) {
        const nextClassTime = document.getElementById('next-class-time').textContent;
        const nextClassDetails = document.getElementById('next-class-details').textContent;
        return `Your next class is at ${nextClassTime}: ${nextClassDetails}`;
    }
    
    if (msg.includes('today') && (msg.includes('schedule') || msg.includes('timetable') || msg.includes('classes'))) {
        const classCount = document.getElementById('classes-count').textContent;
        const classList = document.getElementById('classes-list').textContent;
        return `You have ${classCount} today: ${classList}`;
    }
    
    if (msg.includes('attendance')) {
        const attendance = document.getElementById('attendance-percent').textContent;
        return `Your overall attendance is ${attendance}. Keep it up!`;
    }
    
    if (msg.includes('event')) {
        return `You can check all upcoming campus events in the Events tab. Would you like me to show you specific categories?`;
    }
    
    if (msg.includes('bus')) {
        return `You can book bus seats in the Bus tab. Check available routes and timings there.`;
    }
    
    return `I can help you with:\n- Your schedule and classes\n- Attendance information\n- Campus events\n- Bus bookings\n- Finding campus resources\n\nWhat would you like to know?`;
}

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

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
`;
document.head.appendChild(style);

// Allow Enter key to send message
document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Load dashboard on page load
loadDashboard();
