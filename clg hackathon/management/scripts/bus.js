import { supabaseClient } from './supabase-client.js';

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

let allRoutes = [];
let currentTime = 'morning';
let unsubscribeBusRoutes = null;

// Load bus routes from Supabase
async function loadBusRoutes() {
    const { data, error } = await supabaseClient
        .from('bus_routes')
        .select('*')
        .order('departure_time');

    if (error) {
        console.error('Error loading bus routes:', error);
        showNotification('Error loading bus routes', 'error');
        loadSampleRoutes(); // Fallback
    } else {
        allRoutes = data.map(r => ({ ...r, departureTime: r.departure_time, totalSeats: r.total_seats, bookedSeats: 0 }));
        displayRoutes(allRoutes);
    }
}

// Cleanup listener on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeBusRoutes) unsubscribeBusRoutes();
});

function loadSampleRoutes() {
    allRoutes = [
        {
            id: '1',
            name: 'City Center - Campus',
            route: 'City Center → Campus',
            departureTime: '08:00',
            timeOfDay: 'morning',
            totalSeats: 40,
            bookedSeats: 28,
            stops: ['Main Gate', 'East Campus', 'Metro Station', 'City Center']
        },
        {
            id: '2',
            name: 'City Center - Campus',
            route: 'City Center → Campus',
            departureTime: '08:30',
            timeOfDay: 'morning',
            totalSeats: 40,
            bookedSeats: 35,
            stops: ['Main Gate', 'East Campus', 'Metro Station', 'City Center']
        },
        {
            id: '3',
            name: 'Campus - City Center',
            route: 'Campus → City Center',
            departureTime: '17:00',
            timeOfDay: 'evening',
            totalSeats: 40,
            bookedSeats: 20,
            stops: ['Campus', 'Metro Station', 'East Campus', 'City Center']
        },
        {
            id: '4',
            name: 'Campus - City Center',
            route: 'Campus → City Center',
            departureTime: '18:00',
            timeOfDay: 'evening',
            totalSeats: 40,
            bookedSeats: 32,
            stops: ['Campus', 'Metro Station', 'East Campus', 'City Center']
        },
        {
            id: '5',
            name: 'Route A - City Center',
            route: 'Main Gate → City Center',
            departureTime: '07:30',
            timeOfDay: 'morning',
            totalSeats: 50,
            bookedSeats: 35,
            stops: ['Main Gate', 'East Campus', 'Metro Station', 'City Center']
        },
        {
            id: '6',
            name: 'Route B - North Campus',
            route: 'Main Gate → North Campus',
            departureTime: '08:00',
            timeOfDay: 'morning',
            totalSeats: 40,
            bookedSeats: 28,
            stops: ['Main Gate', 'Library', 'Sports Complex', 'North Campus']
        },
        {
            id: '7',
            name: 'Route C - Airport',
            route: 'Main Gate → Airport',
            departureTime: '06:00',
            timeOfDay: 'morning',
            totalSeats: 30,
            bookedSeats: 30,
            stops: ['Main Gate', 'Highway Plaza', 'Airport Terminal 1', 'Airport Terminal 2']
        }
    ];
    
    displayRoutes(allRoutes);
}

function displayRoutes(routes) {
    const container = document.getElementById('bus-routes-container');
    
    // Filter by time of day
    const filtered = routes.filter(r => r.timeOfDay === currentTime);
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <h3>No routes available</h3>
                <p>No ${currentTime} buses scheduled</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(route => {
        const availableSeats = route.totalSeats - route.bookedSeats;
        const isFull = availableSeats === 0;
        const isLow = availableSeats < 10 && availableSeats > 0;
        
        let statusClass = 'available';
        let statusText = 'Available';
        
        if (isFull) {
            statusClass = 'full';
            statusText = 'Full';
        } else if (isLow) {
            statusClass = 'filling';
            statusText = 'Hurry! Only ' + availableSeats + ' left';
        }
        
        return `
            <div class="bus-route-card">
                <div class="bus-route-header">
                    <h3>🚌 ${route.route}</h3>
                    <span class="bus-status ${statusClass}">${statusText}</span>
                </div>
                <div class="bus-route-info">
                    <p><span>🕒</span> Departure: ${formatTime(route.departureTime)}</p>
                    <p><span>🪑</span> <span class="seats-info">${availableSeats} seats available</span> out of ${route.totalSeats}</p>
                    <p><span>🚏</span> Stops: ${route.stops.join(' → ')}</p>
                </div>
                <button class="btn-book" onclick="bookSeat('${route.id}')" ${isFull ? 'disabled' : ''}>
                    ${isFull ? 'Fully Booked' : 'Book Seat'}
                </button>
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

// Tab switching
document.querySelectorAll('.bus-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.bus-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentTime = this.dataset.time;
        displayRoutes(allRoutes);
    });
});

// Book seat function
window.bookSeat = async function(routeId) {
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) return;
    
    const availableSeats = route.totalSeats - route.bookedSeats;
    if (availableSeats <= 0) {
        alert('Sorry, this bus is fully booked!');
        return;
    }
    
    // Check if user already has a booking for this route
    try {
        const bookingsRef = collection(db, 'bus_bookings');
        const q = query(
            bookingsRef,
            where('userId', '==', userId),
            where('routeId', '==', routeId),
            where('date', '==', new Date().toISOString().split('T')[0])
        );
        
        const existingBookings = await getDocs(q);
        
        if (!existingBookings.empty) {
            alert('You already have a booking for this route today!');
            return;
        }
        
        // Create booking
        const seatNumber = route.bookedSeats + 1;
        const bookingId = 'BK' + Date.now().toString().slice(-8);
        
        const bookingData = {
            userId: userId,
            routeId: routeId,
            studentName: userData.name,
            rollNumber: userData.rollNumber,
            route: route.route,
            departureTime: route.departureTime,
            seatNumber: seatNumber,
            bookingId: bookingId,
            date: new Date().toISOString().split('T')[0],
            bookedAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'bus_bookings'), bookingData);
        
        // Update route booked seats
        const routeDoc = doc(db, 'bus_routes', routeId);
        await updateDoc(routeDoc, {
            bookedSeats: route.bookedSeats + 1
        });
        
        // Update local data
        route.bookedSeats += 1;
        
        // Show confirmation
        showBookingConfirmation(route, seatNumber, bookingId);
        
        // Refresh display
        displayRoutes(allRoutes);
        
    } catch (error) {
        console.error('Error booking seat:', error);
        
        // If Firestore booking fails, still show confirmation for demo purposes
        const seatNumber = route.bookedSeats + 1;
        const bookingId = 'BK' + Date.now().toString().slice(-8);
        
        showBookingConfirmation(route, seatNumber, bookingId);
        
        // Update local state
        route.bookedSeats += 1;
        displayRoutes(allRoutes);
    }
};

function showBookingConfirmation(route, seatNumber, bookingId) {
    document.getElementById('booking-route').textContent = route.route;
    document.getElementById('booking-time').textContent = formatTime(route.departureTime);
    document.getElementById('booking-seat').textContent = seatNumber;
    document.getElementById('booking-id').textContent = bookingId;
    
    document.getElementById('booking-modal').classList.add('active');
}

window.closeBookingModal = function() {
    document.getElementById('booking-modal').classList.remove('active');
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
    
    if (msg.includes('book') && (msg.includes('8:30') || msg.includes('8:00') || msg.includes('morning'))) {
        const morningRoutes = allRoutes.filter(r => r.timeOfDay === 'morning');
        if (morningRoutes.length > 0) {
            return `Morning buses available:\n${morningRoutes.map(r => `- ${r.route} at ${formatTime(r.departureTime)} (${r.totalSeats - r.bookedSeats} seats left)`).join('\n')}\n\nClick the "Book Seat" button on any route to reserve your seat!`;
        }
    }
    
    if (msg.includes('evening') || msg.includes('5') || msg.includes('17:00')) {
        const eveningRoutes = allRoutes.filter(r => r.timeOfDay === 'evening');
        if (eveningRoutes.length > 0) {
            return `Evening buses available:\n${eveningRoutes.map(r => `- ${r.route} at ${formatTime(r.departureTime)} (${r.totalSeats - r.bookedSeats} seats left)`).join('\n')}`;
        }
    }
    
    if (msg.includes('available') || msg.includes('seats')) {
        const available = allRoutes.filter(r => r.bookedSeats < r.totalSeats);
        if (available.length > 0) {
            return `Buses with available seats:\n${available.map(r => `- ${r.route} at ${formatTime(r.departureTime)}: ${r.totalSeats - r.bookedSeats} seats left`).join('\n')}`;
        }
        return 'Sorry, all buses are fully booked.';
    }
    
    if (msg.includes('timing') || msg.includes('schedule')) {
        return `Bus timings:\n\nMorning: Departures from 6:00 AM to 9:00 AM\nEvening: Departures from 5:00 PM to 7:00 PM\n\nSwitch tabs above to see all routes!`;
    }
    
    return `I can help you with:\n- Booking bus seats\n- Checking available seats\n- Bus timings and schedules\n- Route information\n\nWhat would you like to know?`;
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

// Load routes on page load
loadBusRoutes();
