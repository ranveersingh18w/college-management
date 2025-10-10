import { db, storage } from './firebase.js';
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
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Check admin authentication
const userData = JSON.parse(localStorage.getItem('userData'));
const userRole = localStorage.getItem('userRole');

if (!userData || userRole !== 'admin') {
    window.location.href = 'index.html';
}

let currentScheduleBranch = 'all';
let currentEditId = null;
let currentEditType = null;

// Logout function
window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

// Section Navigation
window.showSection = function(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Load section data
    switch(sectionName) {
        case 'schedules':
            loadSchedules();
            break;
        case 'events':
            loadEvents();
            break;
        case 'buses':
            loadBuses();
            break;
        case 'map':
            loadMapLocations();
            break;
        case 'users':
            loadUsers();
            break;
    }
};

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        // Count users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        document.getElementById('total-users').textContent = usersSnapshot.size;
        
        // Count schedules
        const schedulesSnapshot = await getDocs(collection(db, 'branch_schedules'));
        document.getElementById('total-schedules').textContent = schedulesSnapshot.size;
        
        // Count events
        const eventsSnapshot = await getDocs(collection(db, 'events'));
        document.getElementById('total-events').textContent = eventsSnapshot.size;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ========== SCHEDULES MANAGEMENT ==========

window.filterSchedules = function(branch) {
    currentScheduleBranch = branch;
    
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadSchedules();
};

async function loadSchedules() {
    try {
        const schedulesRef = collection(db, 'branch_schedules');
        const querySnapshot = await getDocs(schedulesRef);
        const schedules = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (currentScheduleBranch === 'all' || data.branch === currentScheduleBranch) {
                schedules.push({ id: doc.id, ...data });
            }
        });
        
        displaySchedules(schedules);
    } catch (error) {
        console.error('Error loading schedules:', error);
        displaySchedules([]);
    }
}

function displaySchedules(schedules) {
    const container = document.getElementById('admin-schedules-container');
    
    if (schedules.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <h3>No schedules found</h3>
                <p>Click "Add Schedule" to create the first schedule for students</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = schedules.map(schedule => `
        <div class="admin-card">
            <div class="admin-card-header">
                <div>
                    <h3>${schedule.subject}</h3>
                    <span class="admin-card-badge badge-${schedule.branch.toLowerCase()}">${schedule.branch} - Year ${schedule.year}</span>
                </div>
            </div>
            <div class="admin-card-info">
                <p>👨‍🏫 ${schedule.faculty}</p>
                <p>📅 ${schedule.day}</p>
                <p>🕒 ${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</p>
                <p>📍 ${schedule.location}</p>
            </div>
            <div class="admin-card-actions">
                <button class="btn-small btn-edit" onclick="editSchedule('${schedule.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteSchedule('${schedule.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

window.openScheduleModal = function() {
    currentEditId = null;
    currentEditType = 'schedule';
    document.getElementById('schedule-modal-title').textContent = 'Add Schedule';
    document.getElementById('schedule-form').reset();
    document.getElementById('schedule-id').value = '';
    document.getElementById('schedule-modal').classList.add('active');
};

window.closeScheduleModal = function() {
    document.getElementById('schedule-modal').classList.remove('active');
    currentEditId = null;
};

window.editSchedule = async function(scheduleId) {
    try {
        const scheduleDoc = await getDocs(query(collection(db, 'branch_schedules'), where('__name__', '==', scheduleId)));
        
        scheduleDoc.forEach((doc) => {
            const schedule = doc.data();
            currentEditId = doc.id;
            
            document.getElementById('schedule-modal-title').textContent = 'Edit Schedule';
            document.getElementById('schedule-id').value = doc.id;
            document.getElementById('schedule-branch').value = schedule.branch;
            document.getElementById('schedule-year').value = schedule.year;
            document.getElementById('schedule-subject').value = schedule.subject;
            document.getElementById('schedule-faculty').value = schedule.faculty;
            document.getElementById('schedule-day').value = schedule.day;
            document.getElementById('schedule-start-time').value = schedule.startTime;
            document.getElementById('schedule-end-time').value = schedule.endTime;
            document.getElementById('schedule-location').value = schedule.location;
            
            document.getElementById('schedule-modal').classList.add('active');
        });
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
};

window.deleteSchedule = async function(scheduleId) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
        await deleteDoc(doc(db, 'branch_schedules', scheduleId));
        await loadSchedules();
        alert('Schedule deleted successfully!');
    } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('Failed to delete schedule');
    }
};

document.getElementById('schedule-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const scheduleData = {
        branch: document.getElementById('schedule-branch').value,
        year: document.getElementById('schedule-year').value,
        subject: document.getElementById('schedule-subject').value,
        faculty: document.getElementById('schedule-faculty').value,
        day: document.getElementById('schedule-day').value,
        startTime: document.getElementById('schedule-start-time').value,
        endTime: document.getElementById('schedule-end-time').value,
        location: document.getElementById('schedule-location').value,
        createdAt: new Date().toISOString()
    };
    
    try {
        if (currentEditId) {
            await updateDoc(doc(db, 'branch_schedules', currentEditId), scheduleData);
            alert('Schedule updated successfully!');
        } else {
            await addDoc(collection(db, 'branch_schedules'), scheduleData);
            alert('Schedule added successfully!');
        }
        
        closeScheduleModal();
        await loadSchedules();
    } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Failed to save schedule');
    }
});

// ========== EVENTS MANAGEMENT ==========

async function loadEvents() {
    try {
        const eventsRef = collection(db, 'events');
        const querySnapshot = await getDocs(eventsRef);
        const events = [];
        
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        displayEvents(events);
    } catch (error) {
        console.error('Error loading events:', error);
        displayEvents([]);
    }
}

function displayEvents(events) {
    const container = document.getElementById('admin-events-container');
    
    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <h3>No events found</h3>
                <p>Click "Add Event" to create the first campus event</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="admin-card">
            <div class="admin-card-header">
                <div>
                    <h3>${event.title}</h3>
                    <span class="admin-card-badge badge-${event.category}">${event.category}</span>
                </div>
            </div>
            <div class="admin-card-info">
                <p>${event.description}</p>
                <p>📅 ${event.date}</p>
                <p>🕒 ${event.time || 'TBA'}</p>
                <p>📍 ${event.location}</p>
            </div>
            <div class="admin-card-actions">
                <button class="btn-small btn-edit" onclick="editEvent('${event.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteEvent('${event.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

window.openEventModal = function() {
    currentEditId = null;
    document.getElementById('event-modal-title').textContent = 'Add Event';
    document.getElementById('event-form').reset();
    document.getElementById('event-id').value = '';
    document.getElementById('event-modal').classList.add('active');
};

window.closeEventModal = function() {
    document.getElementById('event-modal').classList.remove('active');
    currentEditId = null;
};

window.editEvent = async function(eventId) {
    try {
        const eventDoc = await getDocs(query(collection(db, 'events'), where('__name__', '==', eventId)));
        
        eventDoc.forEach((doc) => {
            const event = doc.data();
            currentEditId = doc.id;
            
            document.getElementById('event-modal-title').textContent = 'Edit Event';
            document.getElementById('event-id').value = doc.id;
            document.getElementById('event-title').value = event.title;
            document.getElementById('event-description').value = event.description;
            document.getElementById('event-category').value = event.category;
            document.getElementById('event-date').value = event.date;
            document.getElementById('event-time').value = event.time || '';
            document.getElementById('event-location').value = event.location;
            document.getElementById('event-image').value = event.image || '';
            
            document.getElementById('event-modal').classList.add('active');
        });
    } catch (error) {
        console.error('Error loading event:', error);
    }
};

window.deleteEvent = async function(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        await deleteDoc(doc(db, 'events', eventId));
        await loadEvents();
        alert('Event deleted successfully!');
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event');
    }
};

document.getElementById('event-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const eventData = {
        title: document.getElementById('event-title').value,
        description: document.getElementById('event-description').value,
        category: document.getElementById('event-category').value,
        date: document.getElementById('event-date').value,
        time: document.getElementById('event-time').value,
        location: document.getElementById('event-location').value,
        image: document.getElementById('event-image').value || 'https://via.placeholder.com/400x200/667eea/ffffff?text=' + encodeURIComponent(document.getElementById('event-title').value),
        registrationOpen: true,
        attendees: '0 registered',
        createdAt: new Date().toISOString()
    };
    
    try {
        if (currentEditId) {
            await updateDoc(doc(db, 'events', currentEditId), eventData);
            alert('Event updated successfully!');
        } else {
            await addDoc(collection(db, 'events'), eventData);
            alert('Event added successfully!');
        }
        
        closeEventModal();
        await loadEvents();
        await loadDashboardStats();
    } catch (error) {
        console.error('Error saving event:', error);
        alert('Failed to save event');
    }
});

// ========== BUSES MANAGEMENT ==========

async function loadBuses() {
    try {
        const busesRef = collection(db, 'bus_routes');
        const querySnapshot = await getDocs(busesRef);
        const buses = [];
        
        querySnapshot.forEach((doc) => {
            buses.push({ id: doc.id, ...doc.data() });
        });
        
        displayBuses(buses);
    } catch (error) {
        console.error('Error loading buses:', error);
        displayBuses([]);
    }
}

function displayBuses(buses) {
    const container = document.getElementById('admin-buses-container');
    
    if (buses.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <h3>No bus routes found</h3>
                <p>Click "Add Bus Route" to create the first bus route</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = buses.map(bus => `
        <div class="admin-card">
            <div class="admin-card-header">
                <div>
                    <h3>🚌 Bus No. ${bus.busNumber}</h3>
                    <span class="admin-card-badge badge-${bus.timeOfDay === 'morning' ? 'ai' : 'sports'}">${bus.timeOfDay}</span>
                </div>
            </div>
            <div class="admin-card-info">
                <p><strong>${bus.routeName}</strong></p>
                <p>🕒 ${formatTime(bus.departureTime)}</p>
                <p>🪑 ${bus.totalSeats} seats (${bus.bookedSeats || 0} booked)</p>
                <p>🚏 ${bus.stops.join(' → ')}</p>
            </div>
            <div class="admin-card-actions">
                <button class="btn-small btn-edit" onclick="editBus('${bus.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteBus('${bus.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

window.openBusModal = function() {
    currentEditId = null;
    document.getElementById('bus-modal-title').textContent = 'Add Bus Route';
    document.getElementById('bus-form').reset();
    document.getElementById('bus-id').value = '';
    document.getElementById('bus-modal').classList.add('active');
};

window.closeBusModal = function() {
    document.getElementById('bus-modal').classList.remove('active');
    currentEditId = null;
};

window.editBus = async function(busId) {
    try {
        const busDoc = await getDocs(query(collection(db, 'bus_routes'), where('__name__', '==', busId)));
        
        busDoc.forEach((doc) => {
            const bus = doc.data();
            currentEditId = doc.id;
            
            document.getElementById('bus-modal-title').textContent = 'Edit Bus Route';
            document.getElementById('bus-id').value = doc.id;
            document.getElementById('bus-number').value = bus.busNumber;
            document.getElementById('bus-route-name').value = bus.routeName;
            document.getElementById('bus-time-of-day').value = bus.timeOfDay;
            document.getElementById('bus-departure-time').value = bus.departureTime;
            document.getElementById('bus-total-seats').value = bus.totalSeats;
            document.getElementById('bus-stops').value = bus.stops.join(', ');
            
            document.getElementById('bus-modal').classList.add('active');
        });
    } catch (error) {
        console.error('Error loading bus:', error);
    }
};

window.deleteBus = async function(busId) {
    if (!confirm('Are you sure you want to delete this bus route?')) return;
    
    try {
        await deleteDoc(doc(db, 'bus_routes', busId));
        await loadBuses();
        alert('Bus route deleted successfully!');
    } catch (error) {
        console.error('Error deleting bus:', error);
        alert('Failed to delete bus route');
    }
};

document.getElementById('bus-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const stops = document.getElementById('bus-stops').value
        .split(',')
        .map(stop => stop.trim())
        .filter(stop => stop);
    
    const busData = {
        busNumber: document.getElementById('bus-number').value,
        routeName: document.getElementById('bus-route-name').value,
        route: document.getElementById('bus-route-name').value,
        timeOfDay: document.getElementById('bus-time-of-day').value,
        departureTime: document.getElementById('bus-departure-time').value,
        totalSeats: parseInt(document.getElementById('bus-total-seats').value),
        bookedSeats: 0,
        stops: stops,
        createdAt: new Date().toISOString()
    };
    
    try {
        if (currentEditId) {
            await updateDoc(doc(db, 'bus_routes', currentEditId), busData);
            alert('Bus route updated successfully!');
        } else {
            await addDoc(collection(db, 'bus_routes'), busData);
            alert('Bus route added successfully!');
        }
        
        closeBusModal();
        await loadBuses();
    } catch (error) {
        console.error('Error saving bus route:', error);
        alert('Failed to save bus route');
    }
});

// ========== MAP LOCATIONS MANAGEMENT ==========

async function loadMapLocations() {
    try {
        const locationsRef = collection(db, 'campus_resources');
        const querySnapshot = await getDocs(locationsRef);
        const locations = [];
        
        querySnapshot.forEach((doc) => {
            locations.push({ id: doc.id, ...doc.data() });
        });
        
        displayMapLocations(locations);
    } catch (error) {
        console.error('Error loading locations:', error);
        displayMapLocations([]);
    }
}

function displayMapLocations(locations) {
    const container = document.getElementById('admin-map-locations');
    
    if (locations.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <h3>No locations found</h3>
                <p>Click "Add Location" to add campus locations</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = locations.map(location => `
        <div class="location-card">
            <div class="location-card-header">
                <div class="location-icon">${getIconForType(location.type)}</div>
                <div>
                    <h3>${location.name}</h3>
                    <span class="location-type">${location.type}</span>
                </div>
            </div>
            <div class="location-card-info">
                <p>${location.description}</p>
                <p>📍 ${location.location}</p>
                <p>🏢 ${location.floor}</p>
                <p>🕒 ${location.timing}</p>
                ${location.phone ? `<p>📞 ${location.phone}</p>` : ''}
            </div>
            <div class="location-card-actions">
                <button class="btn-small btn-edit" onclick="editLocation('${location.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteLocation('${location.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function getIconForType(type) {
    const icons = {
        'Academic': '🎓',
        'Library': '📚',
        'Lab': '💻',
        'Dining': '🍽️',
        'Sports': '⚽',
        'Facility': '🏢'
    };
    return icons[type] || '📍';
}

window.openMapModal = function() {
    currentEditId = null;
    document.getElementById('map-form').reset();
    document.getElementById('map-modal').classList.add('active');
};

window.closeMapModal = function() {
    document.getElementById('map-modal').classList.remove('active');
    currentEditId = null;
};

window.editLocation = async function(locationId) {
    try {
        const locationDoc = await getDocs(query(collection(db, 'campus_resources'), where('__name__', '==', locationId)));
        
        locationDoc.forEach((doc) => {
            const location = doc.data();
            currentEditId = doc.id;
            
            document.getElementById('map-location-name').value = location.name;
            document.getElementById('map-location-type').value = location.type;
            document.getElementById('map-location-description').value = location.description;
            document.getElementById('map-location-building').value = location.location;
            document.getElementById('map-location-floor').value = location.floor;
            document.getElementById('map-location-timings').value = location.timing;
            document.getElementById('map-location-contact').value = location.phone || '';
            
            document.getElementById('map-modal').classList.add('active');
        });
    } catch (error) {
        console.error('Error loading location:', error);
    }
};

window.deleteLocation = async function(locationId) {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    try {
        await deleteDoc(doc(db, 'campus_resources', locationId));
        await loadMapLocations();
        alert('Location deleted successfully!');
    } catch (error) {
        console.error('Error deleting location:', error);
        alert('Failed to delete location');
    }
};

document.getElementById('map-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const locationData = {
        name: document.getElementById('map-location-name').value,
        type: document.getElementById('map-location-type').value,
        icon: getIconForType(document.getElementById('map-location-type').value),
        description: document.getElementById('map-location-description').value,
        location: document.getElementById('map-location-building').value,
        floor: document.getElementById('map-location-floor').value,
        timing: document.getElementById('map-location-timings').value,
        phone: document.getElementById('map-location-contact').value,
        createdAt: new Date().toISOString()
    };
    
    try {
        if (currentEditId) {
            await updateDoc(doc(db, 'campus_resources', currentEditId), locationData);
            alert('Location updated successfully!');
        } else {
            await addDoc(collection(db, 'campus_resources'), locationData);
            alert('Location added successfully!');
        }
        
        closeMapModal();
        await loadMapLocations();
    } catch (error) {
        console.error('Error saving location:', error);
        alert('Failed to save location');
    }
});

// ========== USERS MANAGEMENT ==========

async function loadUsers() {
    try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        const users = [];
        
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        displayUsers([]);
    }
}

function displayUsers(users) {
    const container = document.getElementById('admin-users-container');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No users registered yet</h3>
                <p>Users will appear here after signing up</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Roll Number</th>
                    <th>Branch</th>
                    <th>Year</th>
                    <th>Email</th>
                    <th>Registered</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td><img src="${user.photoURL}" alt="${user.name}" class="user-avatar"></td>
                        <td>${user.name}</td>
                        <td>${user.rollNumber}</td>
                        <td><span class="admin-card-badge badge-${user.branch?.toLowerCase()}">${user.branch}</span></td>
                        <td>Year ${user.year}</td>
                        <td>${user.email}</td>
                        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Utility function
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Initialize
loadDashboardStats();
