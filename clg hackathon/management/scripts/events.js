import { db } from './firebase.js';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
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

let allEvents = [];
let currentCategory = 'all';
let currentEventId = null;
let unsubscribeEvents = null;

// Load events with real-time updates
function loadEvents() {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('date'));
    
    // Real-time listener for events
    unsubscribeEvents = onSnapshot(q, (snapshot) => {
        allEvents = [];
        
        snapshot.forEach((doc) => {
            allEvents.push({ id: doc.id, ...doc.data() });
        });
        
        displayEvents(allEvents);
        
        // Show notification on updates
        if (snapshot.docChanges().length > 0) {
            const changes = snapshot.docChanges();
            const added = changes.filter(c => c.type === 'added').length;
            const modified = changes.filter(c => c.type === 'modified').length;
            const removed = changes.filter(c => c.type === 'removed').length;
            
            if (added > 0) {
                showNotification(`🎉 ${added} new event(s) added!`, 'success');
            } else if (modified > 0) {
                showNotification(`📝 ${modified} event(s) updated!`, 'info');
            } else if (removed > 0) {
                showNotification(`🗑️ ${removed} event(s) removed!`, 'warning');
            }
        }
    }, (error) => {
        console.error('Error loading events:', error);
        showNotification('Error loading events', 'error');
        // Show sample data if no events in database
        loadSampleEvents();
    });
}

// Cleanup listener on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeEvents) unsubscribeEvents();
});

function loadSampleEvents() {
    allEvents = [
        {
            id: '1',
            title: 'TechFest 2025',
            description: 'Annual technical festival featuring workshops, competitions, and guest lectures',
            date: 'March 15-17, 2025',
            location: 'Main Auditorium',
            category: 'technical',
            attendees: '500 attendees expected',
            image: 'https://via.placeholder.com/400x200/667eea/ffffff?text=TechFest+2025',
            registrationOpen: true
        },
        {
            id: '2',
            title: 'Robotics Workshop',
            description: 'Hands-on workshop on building autonomous robots with Arduino and sensors',
            date: 'March 20, 2025',
            location: 'Engineering Block',
            category: 'technical',
            attendees: '50 attendees expected',
            image: 'https://via.placeholder.com/400x200/764ba2/ffffff?text=Robotics+Workshop',
            registrationOpen: true
        },
        {
            id: '3',
            title: 'Cultural Night',
            description: 'Evening of music, dance, and cultural performances by students',
            date: 'March 23, 2025',
            location: 'Open Ground',
            category: 'cultural',
            attendees: '800 attendees expected',
            image: 'https://via.placeholder.com/400x200/ff6b6b/ffffff?text=Cultural+Night',
            registrationOpen: true
        },
        {
            id: '4',
            title: 'Inter-College Cricket Tournament',
            description: 'Annual cricket tournament with teams from 8 colleges competing for the championship',
            date: 'March 18, 2025',
            location: 'Sports Complex',
            category: 'sports',
            attendees: '180 registered',
            image: 'https://via.placeholder.com/400x200/2ed573/ffffff?text=Cricket+Tournament',
            registrationOpen: true
        }
    ];
    
    displayEvents(allEvents);
}

function displayEvents(events) {
    const container = document.getElementById('events-container');
    
    // Filter by category
    const filtered = currentCategory === 'all' 
        ? events 
        : events.filter(e => e.category === currentCategory);
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                <h3>No events found</h3>
                <p>Check back later for upcoming events</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(event => `
        <div class="event-card" onclick="showEventDetails('${event.id}')">
            <img src="${event.image}" alt="${event.title}" class="event-card-image" onerror="this.src='https://via.placeholder.com/400x200/667eea/ffffff?text=${encodeURIComponent(event.title)}'">
            <div class="event-card-content">
                <span class="event-category ${event.category}">${event.category}</span>
                <h3>${event.title}</h3>
                <p>${event.description.substring(0, 100)}...</p>
                <div class="event-card-footer">
                    <span>📅 ${event.date}</span>
                    ${event.registrationOpen ? '<span class="event-registration">Registration Open</span>' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentCategory = this.dataset.category;
        displayEvents(allEvents);
    });
});

// Show event details
window.showEventDetails = function(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;
    
    currentEventId = eventId;
    
    document.getElementById('event-modal-image').src = event.image;
    document.getElementById('event-modal-category').textContent = event.category;
    document.getElementById('event-modal-category').className = `event-category ${event.category}`;
    document.getElementById('event-modal-title').textContent = event.title;
    document.getElementById('event-modal-description').textContent = event.description;
    document.getElementById('event-modal-date').textContent = event.date;
    document.getElementById('event-modal-location').textContent = event.location;
    document.getElementById('event-modal-attendees').textContent = event.attendees;
    
    // Check if already registered
    checkRegistration(eventId);
    
    document.getElementById('event-modal').classList.add('active');
};

async function checkRegistration(eventId) {
    try {
        const registrationsRef = collection(db, 'event_registrations');
        const q = query(
            registrationsRef,
            where('userId', '==', userId),
            where('eventId', '==', eventId)
        );
        
        const querySnapshot = await getDocs(q);
        const isRegistered = !querySnapshot.empty;
        
        const registerBtn = document.getElementById('register-btn');
        if (isRegistered) {
            registerBtn.textContent = '✓ Registered';
            registerBtn.style.background = '#2ed573';
            registerBtn.disabled = true;
        } else {
            registerBtn.textContent = 'Register Now';
            registerBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            registerBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error checking registration:', error);
    }
}

window.closeEventModal = function() {
    document.getElementById('event-modal').classList.remove('active');
};

window.registerForEvent = async function() {
    try {
        const registrationData = {
            userId: userId,
            eventId: currentEventId,
            studentName: userData.name,
            rollNumber: userData.rollNumber,
            registeredAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'event_registrations'), registrationData);
        
        alert('Successfully registered for the event!');
        checkRegistration(currentEventId);
    } catch (error) {
        console.error('Error registering:', error);
        alert('Registration failed. Please try again.');
    }
};

window.addEventToSchedule = async function() {
    const event = allEvents.find(e => e.id === currentEventId);
    if (!event) return;
    
    try {
        const scheduleData = {
            userId: userId,
            subject: event.title,
            faculty: 'Event',
            day: new Date(event.date).toLocaleDateString('en-US', { weekday: 'long' }),
            startTime: '09:00',
            endTime: '17:00',
            location: event.location,
            attended: false,
            isEvent: true,
            createdAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'schedules'), scheduleData);
        alert('Event added to your schedule!');
    } catch (error) {
        console.error('Error adding to schedule:', error);
        alert('Failed to add to schedule');
    }
};

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
    
    if (msg.includes('today') && msg.includes('event')) {
        const todayEvents = allEvents.filter(e => e.date.includes(new Date().toLocaleDateString()));
        if (todayEvents.length > 0) {
            return `Today's events: ${todayEvents.map(e => e.title).join(', ')}`;
        }
        return 'No events scheduled for today.';
    }
    
    if (msg.includes('techfest')) {
        const techfest = allEvents.find(e => e.title.toLowerCase().includes('techfest'));
        if (techfest) {
            return `TechFest: ${techfest.description}. Date: ${techfest.date}. Location: ${techfest.location}`;
        }
    }
    
    if (msg.includes('technical') || msg.includes('cultural') || msg.includes('sports')) {
        let category = msg.includes('technical') ? 'technical' : msg.includes('cultural') ? 'cultural' : 'sports';
        const categoryEvents = allEvents.filter(e => e.category === category);
        if (categoryEvents.length > 0) {
            return `${category.charAt(0).toUpperCase() + category.slice(1)} events: ${categoryEvents.map(e => e.title).join(', ')}`;
        }
        return `No ${category} events available right now.`;
    }
    
    if (msg.includes('register')) {
        return 'Click on any event card to see details and register for the event!';
    }
    
    return `I can help you with:\n- Finding today's events\n- Getting info about specific events\n- Filtering by category (technical, cultural, sports)\n- Registration help\n\nWhat would you like to know?`;
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
`;
document.head.appendChild(style);

document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Load events on page load
loadEvents();
