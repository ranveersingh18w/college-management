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
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Check admin authentication
const userData = JSON.parse(localStorage.getItem('userData'));
const userRole = localStorage.getItem('userRole');

if (!userData || userRole !== 'admin') {
    window.location.href = 'index.html';
}

// Global variables
let currentView = 'daily';
let currentDate = new Date();
let currentBranch = 'AI';
let currentYear = '1';
let scheduleData = [];
let isSelecting = false;
let selectionStart = null;
let tempBlock = null;
let editingBlockId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeScheduleBuilder();
    loadScheduleData();
});

// Logout
window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

// Initialize schedule builder
function initializeScheduleBuilder() {
    updateDateDisplay();
    initializeDailyGrid();
    initializeWeeklyGrid();
    initializeMonthlyCalendar();
}

// Switch view
window.switchView = function(view) {
    currentView = view;
    
    // Update active tab
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Hide all views
    document.querySelectorAll('.schedule-view').forEach(v => {
        v.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(view + '-view').classList.add('active');
    
    // Reload data
    if (view === 'daily') {
        renderDailySchedule();
    } else if (view === 'weekly') {
        renderWeeklySchedule();
    } else if (view === 'monthly') {
        renderMonthlySchedule();
    }
};

// Navigate date
window.navigateDate = function(direction) {
    if (currentView === 'daily') {
        currentDate.setDate(currentDate.getDate() + direction);
    } else if (currentView === 'weekly') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (currentView === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    }
    
    updateDateDisplay();
    
    if (currentView === 'daily') {
        renderDailySchedule();
    } else if (currentView === 'weekly') {
        renderWeeklySchedule();
    } else if (currentView === 'monthly') {
        renderMonthlySchedule();
    }
};

// Update date display
function updateDateDisplay() {
    const display = document.getElementById('current-date-display');
    
    if (currentView === 'daily') {
        display.textContent = currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else if (currentView === 'weekly') {
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4);
        display.textContent = `Week: ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (currentView === 'monthly') {
        display.textContent = currentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    }
}

// Get week start (Monday)
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// ========== DAILY VIEW ==========

function initializeDailyGrid() {
    const grid = document.getElementById('daily-time-grid');
    
    // Mouse down - start selection
    grid.addEventListener('mousedown', (e) => {
        if (e.target === grid) {
            isSelecting = true;
            const rect = grid.getBoundingClientRect();
            const y = e.clientY - rect.top;
            selectionStart = Math.floor(y / 60);
            
            // Create temporary block
            tempBlock = document.createElement('div');
            tempBlock.className = 'time-block selecting';
            tempBlock.style.top = (selectionStart * 60) + 'px';
            tempBlock.style.height = '60px';
            grid.appendChild(tempBlock);
        }
    });
    
    // Mouse move - extend selection
    grid.addEventListener('mousemove', (e) => {
        if (isSelecting && tempBlock) {
            const rect = grid.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const currentSlot = Math.floor(y / 60);
            
            const start = Math.min(selectionStart, currentSlot);
            const end = Math.max(selectionStart, currentSlot);
            
            tempBlock.style.top = (start * 60) + 'px';
            tempBlock.style.height = ((end - start + 1) * 60) + 'px';
        }
    });
    
    // Mouse up - finish selection
    grid.addEventListener('mouseup', (e) => {
        if (isSelecting && tempBlock) {
            const rect = tempBlock.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            
            const startHour = 9 + Math.floor((rect.top - gridRect.top) / 60);
            const endHour = 9 + Math.ceil((rect.bottom - gridRect.top) / 60);
            
            openClassModal(startHour, endHour);
            
            grid.removeChild(tempBlock);
            tempBlock = null;
            isSelecting = false;
        }
    });
    
    // Mouse leave - cancel selection
    grid.addEventListener('mouseleave', () => {
        if (isSelecting && tempBlock) {
            grid.removeChild(tempBlock);
            tempBlock = null;
            isSelecting = false;
        }
    });
}

function renderDailySchedule() {
    const grid = document.getElementById('daily-time-grid');
    const classList = document.getElementById('classes-list');
    
    // Clear existing blocks (except temporary)
    const existingBlocks = grid.querySelectorAll('.time-block:not(.selecting)');
    existingBlocks.forEach(block => block.remove());
    
    // Get classes for current date
    const dateStr = formatDate(currentDate);
    const dayClasses = scheduleData.filter(c => c.date === dateStr);
    
    // Sort by start time
    dayClasses.sort((a, b) => {
        const aTime = parseInt(a.startTime.replace(':', ''));
        const bTime = parseInt(b.startTime.replace(':', ''));
        return aTime - bTime;
    });
    
    // Render blocks
    dayClasses.forEach(classData => {
        const block = createTimeBlock(classData);
        grid.appendChild(block);
    });
    
    // Update classes list
    classList.innerHTML = '';
    if (dayClasses.length === 0) {
        classList.innerHTML = '<p style="color: #718096; text-align: center;">No classes scheduled for this day. Click and drag on the grid to create one!</p>';
    } else {
        dayClasses.forEach(classData => {
            classList.appendChild(createClassListItem(classData));
        });
    }
}

function createTimeBlock(classData) {
    const block = document.createElement('div');
    block.className = 'time-block';
    
    // Calculate position
    const startParts = classData.startTime.split(':');
    const endParts = classData.endTime.split(':');
    const startHour = parseInt(startParts[0]);
    const startMinute = parseInt(startParts[1]);
    const endHour = parseInt(endParts[0]);
    const endMinute = parseInt(endParts[1]);
    
    const startSlot = (startHour - 9) + (startMinute / 60);
    const endSlot = (endHour - 9) + (endMinute / 60);
    
    block.style.top = (startSlot * 60) + 'px';
    block.style.height = ((endSlot - startSlot) * 60) + 'px';
    
    // Set content
    block.innerHTML = `
        <div class="time-block-subject">${classData.subject}</div>
        <div class="time-block-faculty">${classData.faculty || 'Faculty TBA'}</div>
        <div class="time-block-time">${formatTime(classData.startTime)} - ${formatTime(classData.endTime)}</div>
        <div class="time-block-location">📍 ${classData.location || 'Room TBA'}</div>
    `;
    
    // Add click handler
    block.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(classData);
    });
    
    return block;
}

function createClassListItem(classData) {
    const item = document.createElement('div');
    item.className = 'class-item';
    item.innerHTML = `
        <div class="class-item-time">${formatTime(classData.startTime)} - ${formatTime(classData.endTime)}</div>
        <div class="class-item-details">
            <div class="class-item-subject">${classData.subject}</div>
            <div class="class-item-faculty">${classData.faculty || 'Faculty TBA'} • ${classData.location || 'Room TBA'}</div>
        </div>
    `;
    
    item.addEventListener('click', () => {
        openEditModal(classData);
    });
    
    return item;
}

// ========== WEEKLY VIEW ==========

function initializeWeeklyGrid() {
    const gridBody = document.getElementById('weekly-grid-body');
    const hours = ['9-10', '10-11', '11-12', '12-1', '1-2', '2-3', '3-4'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    hours.forEach(hour => {
        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'week-time-label';
        timeLabel.textContent = hour;
        gridBody.appendChild(timeLabel);
        
        // Day columns
        days.forEach((day, dayIndex) => {
            const cell = document.createElement('div');
            cell.className = 'week-day-column';
            cell.dataset.day = dayIndex;
            cell.dataset.hour = hour;
            
            cell.addEventListener('click', () => {
                const [startH, endH] = hour.split('-');
                const startHour = startH.includes('9') ? 9 : parseInt(startH) + 12;
                const endHour = endH.includes('1') ? 1 + 12 : (endH.includes('2') ? 2 + 12 : (endH.includes('3') ? 3 + 12 : (endH.includes('4') ? 4 + 12 : parseInt(endH))));
                
                openWeeklyClassModal(dayIndex, startHour, endHour);
            });
            
            gridBody.appendChild(cell);
        });
    });
}

function renderWeeklySchedule() {
    const gridBody = document.getElementById('weekly-grid-body');
    const cells = gridBody.querySelectorAll('.week-day-column');
    
    // Clear all cells
    cells.forEach(cell => {
        cell.classList.remove('has-class');
        cell.innerHTML = '';
    });
    
    // Get week start
    const weekStart = getWeekStart(currentDate);
    
    // Get classes for this week
    const weekClasses = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = formatDate(date);
        const dayClasses = scheduleData.filter(c => c.date === dateStr);
        weekClasses.push({ day: i, classes: dayClasses });
    }
    
    // Render classes
    weekClasses.forEach(({ day, classes }) => {
        classes.forEach(classData => {
            const startHour = parseInt(classData.startTime.split(':')[0]);
            const hourRange = `${startHour}-${startHour + 1}`;
            
            const cell = Array.from(cells).find(c => 
                parseInt(c.dataset.day) === day && c.dataset.hour.startsWith(String(startHour - (startHour > 12 ? 12 : 0)))
            );
            
            if (cell) {
                cell.classList.add('has-class');
                cell.innerHTML = `
                    <div style="font-weight: 700; font-size: 12px;">${classData.subject}</div>
                    <div style="font-size: 10px; opacity: 0.9;">${classData.faculty || 'TBA'}</div>
                `;
                
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(classData);
                });
            }
        });
    });
}

function openWeeklyClassModal(dayIndex, startHour, endHour) {
    const weekStart = getWeekStart(currentDate);
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    
    currentDate = date;
    openClassModal(startHour, endHour);
}

// ========== MONTHLY VIEW ==========

function initializeMonthlyCalendar() {
    renderMonthlySchedule();
}

function renderMonthlySchedule() {
    const calendar = document.getElementById('monthly-calendar');
    calendar.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'month-grid';
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'month-day-header';
        dayHeader.textContent = day;
        header.appendChild(dayHeader);
    });
    calendar.appendChild(header);
    
    // Create days grid
    const grid = document.createElement('div');
    grid.className = 'month-grid';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get first day of week (Monday = 1)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    // Fill previous month days
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'month-day other-month';
        grid.appendChild(emptyDay);
    }
    
    // Fill current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const dayClasses = scheduleData.filter(c => c.date === dateStr);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'month-day';
        
        if (date.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }
        
        dayDiv.innerHTML = `<div class="month-day-number">${day}</div>`;
        
        const classesDiv = document.createElement('div');
        classesDiv.className = 'month-day-classes';
        
        dayClasses.forEach(classData => {
            const dot = document.createElement('div');
            dot.className = 'month-class-dot';
            dot.textContent = classData.subject.substring(0, 8);
            dot.title = `${classData.subject} (${classData.startTime} - ${classData.endTime})`;
            classesDiv.appendChild(dot);
        });
        
        dayDiv.appendChild(classesDiv);
        
        dayDiv.addEventListener('click', () => {
            currentDate = date;
            switchView('daily');
            document.querySelector('[data-view="daily"]').click();
        });
        
        grid.appendChild(dayDiv);
    }
    
    calendar.appendChild(grid);
}

// ========== MODAL FUNCTIONS ==========

window.openClassModal = function(startHour, endHour) {
    const modal = document.getElementById('class-modal');
    const timeDisplay = document.getElementById('selected-time-display');
    
    const startTime = `${String(startHour).padStart(2, '0')}:00`;
    const endTime = `${String(endHour).padStart(2, '0')}:00`;
    
    timeDisplay.textContent = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    timeDisplay.dataset.start = startTime;
    timeDisplay.dataset.end = endTime;
    
    // Clear form
    document.getElementById('class-subject').value = '';
    document.getElementById('class-faculty').value = '';
    document.getElementById('class-location').value = '';
    
    modal.classList.add('active');
};

window.closeClassModal = function() {
    document.getElementById('class-modal').classList.remove('active');
};

window.saveClassBlock = function() {
    const subject = document.getElementById('class-subject').value.trim();
    const faculty = document.getElementById('class-faculty').value.trim();
    const location = document.getElementById('class-location').value.trim();
    const timeDisplay = document.getElementById('selected-time-display');
    
    if (!subject) {
        alert('Please enter subject name');
        return;
    }
    
    const classData = {
        id: Date.now().toString(),
        branch: currentBranch,
        year: currentYear,
        date: formatDate(currentDate),
        subject: subject,
        faculty: faculty,
        location: location,
        startTime: timeDisplay.dataset.start,
        endTime: timeDisplay.dataset.end,
        day: currentDate.toLocaleDateString('en-US', { weekday: 'long' })
    };
    
    scheduleData.push(classData);
    closeClassModal();
    
    if (currentView === 'daily') {
        renderDailySchedule();
    } else if (currentView === 'weekly') {
        renderWeeklySchedule();
    } else if (currentView === 'monthly') {
        renderMonthlySchedule();
    }
    
    showNotification('Class added! Don\'t forget to save.', 'success');
};

window.openEditModal = function(classData) {
    editingBlockId = classData.id;
    const modal = document.getElementById('edit-modal');
    
    document.getElementById('edit-subject').value = classData.subject;
    document.getElementById('edit-faculty').value = classData.faculty || '';
    document.getElementById('edit-location').value = classData.location || '';
    document.getElementById('edit-start-time').value = classData.startTime;
    document.getElementById('edit-end-time').value = classData.endTime;
    
    modal.classList.add('active');
};

window.closeEditModal = function() {
    document.getElementById('edit-modal').classList.remove('active');
    editingBlockId = null;
};

window.updateClassBlock = function() {
    const subject = document.getElementById('edit-subject').value.trim();
    const faculty = document.getElementById('edit-faculty').value.trim();
    const location = document.getElementById('edit-location').value.trim();
    const startTime = document.getElementById('edit-start-time').value;
    const endTime = document.getElementById('edit-end-time').value;
    
    if (!subject) {
        alert('Please enter subject name');
        return;
    }
    
    const classIndex = scheduleData.findIndex(c => c.id === editingBlockId);
    if (classIndex !== -1) {
        scheduleData[classIndex] = {
            ...scheduleData[classIndex],
            subject,
            faculty,
            location,
            startTime,
            endTime
        };
    }
    
    closeEditModal();
    
    if (currentView === 'daily') {
        renderDailySchedule();
    } else if (currentView === 'weekly') {
        renderWeeklySchedule();
    } else if (currentView === 'monthly') {
        renderMonthlySchedule();
    }
    
    showNotification('Class updated!', 'success');
};

window.deleteClassBlock = function() {
    if (confirm('Are you sure you want to delete this class?')) {
        scheduleData = scheduleData.filter(c => c.id !== editingBlockId);
        closeEditModal();
        
        if (currentView === 'daily') {
            renderDailySchedule();
        } else if (currentView === 'weekly') {
            renderWeeklySchedule();
        } else if (currentView === 'monthly') {
            renderMonthlySchedule();
        }
        
        showNotification('Class deleted!', 'success');
    }
};

// ========== DATA MANAGEMENT ==========

window.loadScheduleData = async function() {
    const branch = document.getElementById('branch-select').value;
    const year = document.getElementById('year-select').value;
    
    currentBranch = branch;
    currentYear = year;
    
    try {
        const q = query(
            collection(db, 'visual_schedules'),
            where('branch', '==', branch),
            where('year', '==', year)
        );
        
        const snapshot = await getDocs(q);
        scheduleData = [];
        
        snapshot.forEach(doc => {
            scheduleData.push({
                firestoreId: doc.id,
                ...doc.data()
            });
        });
        
        if (currentView === 'daily') {
            renderDailySchedule();
        } else if (currentView === 'weekly') {
            renderWeeklySchedule();
        } else if (currentView === 'monthly') {
            renderMonthlySchedule();
        }
        
        showNotification(`Loaded ${scheduleData.length} classes for ${branch} Year ${year}`, 'info');
    } catch (error) {
        console.error('Error loading schedule:', error);
        showNotification('Error loading schedule', 'error');
    }
};

window.saveAllSchedules = async function() {
    if (scheduleData.length === 0) {
        alert('No classes to save!');
        return;
    }
    
    const saveBtn = event.target;
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
    
    try {
        // Delete existing schedules for this branch/year
        const q = query(
            collection(db, 'visual_schedules'),
            where('branch', '==', currentBranch),
            where('year', '==', currentYear)
        );
        
        const snapshot = await getDocs(q);
        const deletePromises = [];
        snapshot.forEach(doc => {
            deletePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deletePromises);
        
        // Save all classes
        const savePromises = [];
        scheduleData.forEach(classData => {
            const { firestoreId, ...dataToSave } = classData;
            savePromises.push(addDoc(collection(db, 'visual_schedules'), dataToSave));
        });
        
        await Promise.all(savePromises);
        
        showNotification(`✅ Saved ${scheduleData.length} classes successfully!`, 'success');
    } catch (error) {
        console.error('Error saving schedules:', error);
        showNotification('Error saving schedules', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save All';
    }
};

// ========== UTILITY FUNCTIONS ==========

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayHour}:${minutes} ${ampm}`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#667eea'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
