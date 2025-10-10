// Shared chatbot functionality
export function initChatbot() {
    console.log('Chatbot initialized');
}

export function processChatMessage(message, context = {}) {
    const msg = message.toLowerCase();
    
    // Common responses
    const responses = {
        greeting: [
            'Hello! How can I help you today?',
            'Hi there! What can I do for you?',
            'Hey! I\'m here to assist you.'
        ],
        thanks: [
            'You\'re welcome! 😊',
            'Happy to help!',
            'Anytime! Let me know if you need anything else.'
        ],
        help: `I can help you with:
        
🏠 Home - View your dashboard and daily overview
📅 Schedule - Manage your classes and attendance  
🎉 Events - Browse and register for campus events
📍 Resources - Find campus facilities and locations
🚌 Bus - Book bus seats and check availability

Just ask me anything!`
    };
    
    // Greetings
    if (msg.match(/^(hi|hello|hey|greetings)/)) {
        return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    }
    
    // Thanks
    if (msg.match(/thank|thanks|thx/)) {
        return responses.thanks[Math.floor(Math.random() * responses.thanks.length)];
    }
    
    // Help
    if (msg.match(/help|what can you do|features/)) {
        return responses.help;
    }
    
    // Navigation
    if (msg.includes('home') || msg.includes('dashboard')) {
        return 'You can go to the Home page from the navigation menu to see your dashboard with today\'s schedule and attendance.';
    }
    
    if (msg.includes('schedule') || msg.includes('timetable')) {
        return 'Visit the Schedule page to view and manage your classes, or I can answer specific questions about your schedule!';
    }
    
    if (msg.includes('event')) {
        return 'Check out the Events page to browse upcoming campus events, or ask me about specific events!';
    }
    
    if (msg.includes('resource') || msg.includes('location') || msg.includes('find')) {
        return 'Go to the Resources page to find campus facilities, or ask me directly like "Where is the library?"';
    }
    
    if (msg.includes('bus')) {
        return 'Visit the Bus page to book seats and check routes, or ask me about bus timings and availability!';
    }
    
    // Default response
    return 'I\'m here to help! You can ask me about:\n- Your schedule and classes\n- Campus events\n- Finding locations\n- Bus bookings\n- Attendance info\n\nWhat would you like to know?';
}

export function addMessageToChat(container, message, isBot = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isBot ? 'bot-message' : 'user-message';
    messageDiv.innerHTML = `<p>${message}</p>`;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}
