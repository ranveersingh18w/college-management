document.addEventListener('DOMContentLoaded', () => {
    // Default tab
    openTab(null, 'schedule');

    // Populate student filters and load initial data
    setupStudentFilters();
    loadSchedule();
    loadEvents();
    loadBusRoutes();
    loadResources();

    // Chatbot functionality
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatInputField = document.getElementById('chat-input-field');
    chatSendBtn.addEventListener('click', handleChatSend);
    chatInputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleChatSend();
        }
    });
});

function openTab(evt, tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = 'none';
    }

    const tabLinks = document.getElementsByClassName('tab-link');
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].className = tabLinks[i].className.replace(' active', '');
    }

    document.getElementById(tabName).style.display = 'block';
    if (evt) {
        evt.currentTarget.className += ' active';
    } else {
        // Find the button that controls this tab and mark it active
        document.querySelector(`.tab-link[onclick*="'${tabName}'"]`).classList.add('active');
    }
}

function setupStudentFilters() {
    const yearSelect = document.getElementById('student-year-select');
    const sectionSelect = document.getElementById('student-section-select');

    function updateSections() {
        const year = yearSelect.value;
        sectionSelect.innerHTML = '';
        const sections = year === '1' ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];
        sections.forEach(sec => {
            const option = document.createElement('option');
            option.value = sec;
            option.textContent = `Section ${sec}`;
            sectionSelect.appendChild(option);
        });
    }

    yearSelect.addEventListener('change', () => {
        updateSections();
        loadSchedule();
    });
    
    sectionSelect.addEventListener('change', loadSchedule);

    // Initial setup
    updateSections();
}

async function loadSchedule() {
    const year = document.getElementById('student-year-select').value;
    const section = document.getElementById('student-section-select').value;

    const { data, error } = await supabase
        .from('unified_schedules')
        .select('*')
        .eq('year', year)
        .eq('section', section);

    if (error) {
        console.error('Error loading schedule:', error);
        return;
    }

    const scheduleContent = document.getElementById('schedule-content');
    let html = '<table><thead><tr><th>Course</th><th>Day</th><th>Time</th><th>Location</th><th>Faculty</th></tr></thead><tbody>';
    data.forEach(item => {
        html += `<tr>
            <td>${item.course_name}</td>
            <td>${item.day_of_week}</td>
            <td>${item.start_time} - ${item.end_time}</td>
            <td>${item.location}</td>
            <td>${item.faculty_name}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    scheduleContent.innerHTML = html;
}

async function loadEvents() {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        console.error('Error loading events:', error);
        return;
    }

    const eventsContent = document.getElementById('events-content');
    let html = '';
    data.forEach(event => {
        html += `<div class="card">
            <h3>${event.name}</h3>
            <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${event.time}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p>${event.description}</p>
            <button>Register</button>
        </div>`;
    });
    eventsContent.innerHTML = html;
}

async function loadBusRoutes() {
    const { data, error } = await supabase
        .from('bus_routes')
        .select('id, route_name, departure_time, total_seats');

    if (error) {
        console.error('Error loading bus routes:', error);
        return;
    }

    const busContent = document.getElementById('bus-content');
    let html = '<table><thead><tr><th>Route</th><th>Departure Time</th><th>Total Seats</th><th>Action</th></tr></thead><tbody>';
    data.forEach(route => {
        html += `<tr>
            <td>${route.route_name}</td>
            <td>${route.departure_time}</td>
            <td>${route.total_seats}</td>
            <td><button>Book Seat</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    busContent.innerHTML = html;
}

async function loadResources() {
    const { data, error } = await supabase
        .from('campus_resources')
        .select('*');

    if (error) {
        console.error('Error loading resources:', error);
        return;
    }

    const resourcesContent = document.getElementById('resources-content');
    let html = '';
    data.forEach(resource => {
        html += `<div class="accordion-item">
            <div class="accordion-header">${resource.name}</div>
            <div class="accordion-content">
                <p><strong>Type:</strong> ${resource.type}</p>
                <p><strong>Availability:</strong> ${resource.availability}</p>
                <p><strong>Location:</strong> ${resource.location}</p>
            </div>
        </div>`;
    });
    resourcesContent.innerHTML = html;

    // Add event listeners for accordion
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            content.style.display = content.style.display === 'block' ? 'none' : 'block';
        });
    });
}

function handleChatSend() {
    const inputField = document.getElementById('chat-input-field');
    const message = inputField.value.trim();
    if (message) {
        const chatBox = document.getElementById('chat-box');
        
        // Add user message
        const userMsgDiv = document.createElement('div');
        userMsgDiv.textContent = `You: ${message}`;
        chatBox.appendChild(userMsgDiv);

        // Simple bot response
        const botMsgDiv = document.createElement('div');
        botMsgDiv.textContent = `Bot: I am a simple bot. You said: "${message}"`;
        chatBox.appendChild(botMsgDiv);

        inputField.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}
