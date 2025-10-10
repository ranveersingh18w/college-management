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

let allResources = [];

// Load resources from Supabase
async function loadResources() {
    const { data, error } = await supabaseClient
        .from('campus_resources')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error loading resources:', error);
        showNotification('Error loading resources', 'error');
        loadSampleResources(); // Fallback
    } else {
        allResources = data;
        displayResources(allResources);
    }
}

function loadSampleResources() {
    allResources = [
        {
            id: '1',
            name: 'Central Library',
            type: 'Library',
            icon: '📚',
            location: 'Block A, Ground Floor',
            floor: 'Ground Floor',
            timing: '8:00 AM - 8:00 PM',
            phone: '+1 234-567-8901',
            description: 'Central library with study halls, computer lab, and vast collection of books and journals.'
        },
        {
            id: '2',
            name: 'Computer Lab',
            type: 'Lab',
            icon: '💻',
            location: 'Block B, 3rd Floor, Room 301',
            floor: '3rd Floor',
            timing: '9:00 AM - 6:00 PM',
            phone: '+1 234-567-8901',
            description: 'State-of-the-art computer lab with 100+ workstations and high-speed internet.'
        },
        {
            id: '3',
            name: 'AI Lab',
            type: 'Lab',
            icon: '🤖',
            location: 'Block B, 3rd Floor, Room 305',
            floor: '3rd Floor',
            timing: '9:00 AM - 5:00 PM',
            phone: '+1 234-567-8903',
            description: 'Advanced AI and Machine Learning research facility with GPU workstations.'
        },
        {
            id: '4',
            name: 'Student Cafeteria',
            type: 'Dining',
            icon: '🍽️',
            location: 'Block C, Ground Floor',
            floor: 'Ground Floor',
            timing: '7:00 AM - 9:00 PM',
            phone: '+1 234-567-8904',
            description: 'Main dining facility offering breakfast, lunch, and snacks throughout the day.'
        },
        {
            id: '5',
            name: 'Sports Complex',
            type: 'Sports',
            icon: '⚽',
            location: 'Behind Main Campus',
            floor: 'Ground Level',
            timing: '6:00 AM - 8:00 PM',
            phone: '+1 234-567-8904',
            description: 'Indoor and outdoor sports facilities including gym, basketball court, and cricket ground.'
        },
        {
            id: '6',
            name: 'Medical Center',
            type: 'Facility',
            icon: '🏥',
            location: 'Block A, 1st Floor',
            floor: '1st Floor',
            timing: '8:00 AM - 6:00 PM (Emergency: 911)',
            phone: '+1 234-567-8905 (Emergency: 911)',
            description: 'On-campus medical facility with doctors and nurses available for student health services.'
        },
        {
            id: '7',
            name: 'Main Auditorium',
            type: 'Academic',
            icon: '🎭',
            location: 'Central Block',
            floor: 'Ground Floor',
            timing: 'Event based',
            phone: '+1 234-567-8906',
            description: 'Main auditorium for events, seminars, and cultural programs with seating for 500.'
        },
        {
            id: '8',
            name: 'Student Union Office',
            type: 'Facility',
            icon: '🏢',
            location: 'Block A, 2nd Floor',
            floor: '2nd Floor',
            timing: '9:00 AM - 5:00 PM',
            phone: '+1 234-567-8907',
            description: 'Student union office for student affairs, clubs, and extracurricular activities.'
        }
    ];
    
    displayResources(allResources);
}

function displayResources(resources) {
    const container = document.getElementById('resources-container');
    
    if (resources.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                <h3>No resources found</h3>
                <p>Try a different search term</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = resources.map(resource => `
        <div class="resource-card">
            <div class="resource-card-header">
                <span class="resource-icon">${resource.icon}</span>
                <div>
                    <h3>${resource.name}</h3>
                    <span class="resource-type">${resource.type}</span>
                </div>
            </div>
            <p style="color: #666; margin-bottom: 15px; font-size: 14px;">${resource.description}</p>
            <div class="resource-card-info">
                <p><span>📍</span> ${resource.location}</p>
                <p><span>🏢</span> ${resource.floor}</p>
                <p><span>🕒</span> ${resource.timing}</p>
                <p><span>📞</span> ${resource.phone}</p>
            </div>
        </div>
    `).join('');
}

// Search function
window.searchResources = function() {
    const searchTerm = document.getElementById('resource-search').value.toLowerCase();
    
    if (!searchTerm) {
        displayResources(allResources);
        return;
    }
    
    const filtered = allResources.filter(resource => 
        resource.name.toLowerCase().includes(searchTerm) ||
        resource.type.toLowerCase().includes(searchTerm) ||
        resource.location.toLowerCase().includes(searchTerm) ||
        resource.description.toLowerCase().includes(searchTerm)
    );
    
    displayResources(filtered);
};

// Search on Enter key
document.getElementById('resource-search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchResources();
    }
});

// Tab switching
window.showResourcesTab = function(tabName) {
    if (tabName === 'list') {
        document.getElementById('list-view-tab').style.display = 'block';
        document.getElementById('map-view-tab').style.display = 'none';
    } else {
        document.getElementById('list-view-tab').style.display = 'none';
        document.getElementById('map-view-tab').style.display = 'block';
        loadMapView();
    }
    
    // Update tabs
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
};

function loadMapView() {
    const container = document.getElementById('map-locations-list');
    displayResources(allResources);
    
    // Also display in map locations list
    container.innerHTML = allResources.map(resource => `
        <div class="resource-card">
            <div class="resource-card-header">
                <span class="resource-icon">${resource.icon}</span>
                <div>
                    <h3>${resource.name}</h3>
                    <span class="resource-type">${resource.type}</span>
                </div>
            </div>
            <p style="color: #666; margin-bottom: 15px; font-size: 14px;">${resource.description}</p>
            <div class="resource-card-info">
                <p><span>📍</span> ${resource.location}</p>
                <p><span>🏢</span> ${resource.floor}</p>
                <p><span>🕒</span> ${resource.timing}</p>
                <p><span>📞</span> ${resource.phone}</p>
            </div>
        </div>
    `).join('');
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
    
    // Search for specific resources
    const keywords = ['library', 'computer lab', 'ai lab', 'cafeteria', 'canteen', 'sports', 'medical', 'auditorium', 'gym'];
    
    for (let keyword of keywords) {
        if (msg.includes(keyword)) {
            const found = allResources.find(r => 
                r.name.toLowerCase().includes(keyword) || 
                r.type.toLowerCase().includes(keyword)
            );
            
            if (found) {
                return `📍 ${found.name}\nLocation: ${found.location}\nTiming: ${found.timing}\nContact: ${found.phone}\n\n${found.description}`;
            }
        }
    }
    
    if (msg.includes('where') || msg.includes('location')) {
        return 'Please specify which facility you\'re looking for. For example: "Where is the library?" or "Computer lab location"';
    }
    
    if (msg.includes('timing') || msg.includes('hours') || msg.includes('open')) {
        return 'Please specify which facility you want to know the timings for. For example: "Library timings" or "When does the cafeteria open?"';
    }
    
    return `I can help you find:\n- Library\n- Computer Lab\n- AI Lab\n- Cafeteria\n- Sports Complex\n- Medical Center\n- Auditorium\n\nJust ask "Where is the [facility name]?" or search above!`;
}

document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Load resources on page load
loadResources();
