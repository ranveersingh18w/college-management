// ============================================
// UNIFIED SCHEDULE - SUPABASE VERSION
// ============================================

let currentYear = 'Year 2';
let currentSection = 'A';
let scheduleData = [];

// Initialize Supabase on page load
window.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing Supabase Schedule System...');
    
    // Initialize Supabase
    const initialized = await window.supabaseDB.initialize();
    
    if (!initialized) {
        console.error('❌ Failed to initialize Supabase');
        alert('Failed to connect to database. Please check your connection.');
        return;
    }
    
    // Load initial data
    await loadScheduleData();
    
    // Subscribe to real-time updates
    subscribeToUpdates();
    
    // Setup dropdown change listeners
    setupEventListeners();
    
    console.log('✅ Supabase Schedule System initialized');
});

// Load schedule data from Supabase
async function loadScheduleData() {
    try {
        console.log(`📊 Loading schedule data: ${currentYear}, ${currentSection}`);
        
        const data = await window.supabaseDB.fetchClasses(currentYear, currentSection);
        
        // Convert to app format
        scheduleData = window.supabaseDB.convertToAppFormat(data);
        
        console.log(`✅ Loaded ${scheduleData.length} classes`);
        
        // Update calendar display
        renderCalendar();
        
        return scheduleData;
    } catch (error) {
        console.error('❌ Error loading schedule data:', error);
        alert('Error loading schedule: ' + error.message);
        return [];
    }
}

// Subscribe to real-time updates
function subscribeToUpdates() {
    window.supabaseDB.subscribe(currentYear, currentSection, async (payload) => {
        console.log('🔔 Real-time update received:', payload.eventType);
        
        // Reload data when changes occur
        await loadScheduleData();
    });
}

// Setup event listeners for year/section dropdowns
function setupEventListeners() {
    const yearSelect = document.getElementById('yearSelect');
    const sectionSelect = document.getElementById('sectionSelect');
    
    if (yearSelect) {
        yearSelect.addEventListener('change', async function(e) {
            currentYear = e.target.value;
            console.log(`📅 Year changed to: ${currentYear}`);
            
            // Unsubscribe from old channel and subscribe to new
            window.supabaseDB.unsubscribe();
            await loadScheduleData();
            subscribeToUpdates();
        });
    }
    
    if (sectionSelect) {
        sectionSelect.addEventListener('change', async function(e) {
            currentSection = e.target.value;
            console.log(`📅 Section changed to: ${currentSection}`);
            
            // Unsubscribe from old channel and subscribe to new
            window.supabaseDB.unsubscribe();
            await loadScheduleData();
            subscribeToUpdates();
        });
    }
}

// Render calendar with current schedule data
function renderCalendar() {
    console.log('🎨 Rendering calendar...');
    
    // Group classes by date
    const classesByDate = {};
    
    scheduleData.forEach(classItem => {
        if (!classesByDate[classItem.date]) {
            classesByDate[classItem.date] = [];
        }
        classesByDate[classItem.date].push(classItem);
    });
    
    // Sort classes by time for each date
    Object.keys(classesByDate).forEach(date => {
        classesByDate[date].sort((a, b) => a.startHour - b.startHour);
    });
    
    // TODO: Update your calendar UI here
    // This is where you render the calendar with classesByDate
    
    console.log('✅ Calendar rendered', classesByDate);
    
    // If you have existing calendar rendering function, call it here
    if (typeof updateCalendarDisplay === 'function') {
        updateCalendarDisplay(classesByDate);
    }
}

// Export for use in other scripts
window.loadScheduleData = loadScheduleData;
window.scheduleData = scheduleData;
window.currentYear = currentYear;
window.currentSection = currentSection;
