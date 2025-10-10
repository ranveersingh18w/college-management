import { supabaseClient } from './supabase-client.js';

// Check admin authentication
const userData = JSON.parse(localStorage.getItem('userData'));
const userRole = localStorage.getItem('userRole');

if (!userData || userRole !== 'admin') {
    window.location.href = 'index.html';
}

// Global variables
let currentView = 'week';
let currentYear = '1';
let currentSection = 'A';
let currentWeekStart = null;
let currentMonth = new Date();
let scheduleData = [];
let isSelecting = false;
let selectedCells = new Set();
let editingClassId = null;
let selectedDayDate = null;
let unsubscribeSchedules = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    currentYear = document.getElementById('year-select').value;
    currentSection = document.getElementById('section-select').value;
    currentWeekStart = getWeekStart(new Date());
    updateSectionOptions();
    setupWeeklyView();
    loadScheduleData();
});

// Update section options based on year
window.updateSectionOptions = function() {
    const year = document.getElementById('year-select').value;
    const sectionSelect = document.getElementById('section-select');
    
    sectionSelect.innerHTML = '';
    
    if (year === '1') {
        // 1st year has A, B, C, D
        ['A', 'B', 'C', 'D'].forEach(sec => {
            const option = document.createElement('option');
            option.value = sec;
            option.textContent = `Section ${sec}`;
            sectionSelect.appendChild(option);
        });
    } else {
        // 2nd and 3rd year have A, B, C
        ['A', 'B', 'C'].forEach(sec => {
            const option = document.createElement('option');
            option.value = sec;
            option.textContent = `Section ${sec}`;
            sectionSelect.appendChild(option);
        });
    }
    
    currentSection = sectionSelect.value;
    loadScheduleData();
};

// Logout
window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

// Navigation functions
window.showSection = function(section) {
    switch(section) {
        case 'events':
            window.location.href = 'admin.html#events';
            break;
        case 'buses':
            window.location.href = 'admin.html#buses';
            break;
        case 'map':
            window.location.href = 'admin.html#map';
            break;
        case 'users':
            window.location.href = 'admin.html#users';
            break;
        default:
            window.location.href = 'admin.html';
    }
};

// Switch view (week/month)
window.switchView = function(view) {
    currentView = view;
    
    // Update active button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Toggle views
    document.getElementById('weekly-view').classList.toggle('active', view === 'week');
    document.getElementById('monthly-view').classList.toggle('active', view === 'month');
    document.getElementById('week-nav').style.display = view === 'week' ? 'flex' : 'none';
    document.getElementById('month-nav').style.display = view === 'month' ? 'flex' : 'none';
    
    if (view === 'week') {
        updateWeekDisplay();
        renderWeeklySchedule();
    } else {
        updateMonthDisplay();
        renderMonthlyCalendar();
    }
};

// Load schedule data from Supabase
window.loadScheduleData = async function() {
    const year = document.getElementById('year-select').value;
    const section = document.getElementById('section-select').value;
    
    currentYear = year;
    currentSection = section;
    
    const { data, error } = await supabaseClient
        .from('unified_schedules')
        .select('*')
        .eq('year', year)
        .eq('section', section);

    if (error) {
        console.error('Error loading schedule:', error);
        showNotification('Error loading schedule', 'error');
        scheduleData = [];
    } else {
        scheduleData = data;
        showNotification(`📅 Schedule loaded: Year ${year} Section ${section}`, 'info');
    }

    if (currentView === 'week') {
        renderWeeklySchedule();
    } else {
        renderMonthlyCalendar();
    }
};

// Get week start (Monday)
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Navigate week
window.navigateWeek = function(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    updateWeekDisplay();
    renderWeeklySchedule();
};

// Navigate month
window.navigateMonth = function(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    updateMonthDisplay();
    renderMonthlyCalendar();
};

// Update week display
function updateWeekDisplay() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 5);
    
    const display = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    document.getElementById('week-display').textContent = display;
}

// Update month display
function updateMonthDisplay() {
    document.getElementById('month-display').textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Setup weekly view
function setupWeeklyView() {
    const daysGrid = document.getElementById('days-grid');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
    
    daysGrid.innerHTML = '';
    
    days.forEach((dayName, dayIndex) => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        
        // Day header
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-date" data-day="${dayIndex}"></div>
        `;
        dayColumn.appendChild(header);
        
        // Time cells
        times.forEach((time, timeIndex) => {
            const cell = document.createElement('div');
            cell.className = 'class-cell';
            cell.dataset.day = dayIndex;
            cell.dataset.time = timeIndex;
            cell.dataset.timeStr = time;
            
            // Mouse events for selection
            cell.addEventListener('mousedown', startSelection);
            cell.addEventListener('mouseenter', extendSelection);
            cell.addEventListener('mouseup', endSelection);
            
            dayColumn.appendChild(cell);
        });
        
        daysGrid.appendChild(dayColumn);
    });
    
    // Global mouse up to end selection
    document.addEventListener('mouseup', () => {
        if (isSelecting) {
            endSelection();
        }
    });
    
    updateWeekDisplay();
    renderWeeklySchedule();
}

// Start cell selection
function startSelection(e) {
    if (e.target.classList.contains('has-class')) {
        // Click on existing class to edit
        const classId = e.target.dataset.classId;
        const classInfo = scheduleData.find(c => c.id === classId);
        if (classInfo) {
            openEditModal(classInfo);
        }
        return;
    }
    
    isSelecting = true;
    selectedCells.clear();
    
    // Clear previous selections
    document.querySelectorAll('.class-cell.selecting').forEach(cell => {
        cell.classList.remove('selecting');
    });
    
    e.target.classList.add('selecting');
    selectedCells.add(e.target);
}

// Extend selection
function extendSelection(e) {
    if (!isSelecting) return;
    if (e.target.classList.contains('class-cell') && !e.target.classList.contains('has-class')) {
        if (!selectedCells.has(e.target)) {
            e.target.classList.add('selecting');
            selectedCells.add(e.target);
        }
    }
}

// End selection
function endSelection() {
    if (!isSelecting) return;
    isSelecting = false;
    
    if (selectedCells.size > 0) {
        openClassModal();
    }
}

// Open class creation modal
window.openClassModal = function() {
    if (selectedCells.size === 0) return;
    
    const modal = document.getElementById('class-modal');
    const selectionDisplay = document.getElementById('selection-display');
    
    // Parse selection
    const selection = parseSelection();
    selectionDisplay.innerHTML = `
        <div style="margin: 5px 0;"><strong>📅 Days:</strong> ${selection.days.join(', ')}</div>
        <div style="margin: 5px 0;"><strong>📍 Week:</strong> ${selection.dateRange}</div>
    `;
    
    // Clear form
    document.getElementById('class-subject').value = '';
    document.getElementById('class-faculty').value = '';
    document.getElementById('class-start-time').value = selection.timeStart.padStart(5, '0');
    document.getElementById('class-end-time').value = selection.timeEnd.padStart(5, '0');
    document.getElementById('class-start-date').value = '';
    document.getElementById('class-end-date').value = '';
    
    modal.classList.add('active');
};

// Parse selection
function parseSelection() {
    const cellsArray = Array.from(selectedCells);
    
    // Get unique days
    const dayIndices = [...new Set(cellsArray.map(cell => parseInt(cell.dataset.day)))];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = dayIndices.sort((a, b) => a - b).map(i => dayNames[i]);
    
    // Get time range
    const timeIndices = [...new Set(cellsArray.map(cell => parseInt(cell.dataset.time)))];
    const minTime = Math.min(...timeIndices);
    const maxTime = Math.max(...timeIndices);
    
    const timeStart = String(9 + minTime).padStart(2, '0') + ':00';
    const timeEnd = String(9 + maxTime + 1).padStart(2, '0') + ':00';
    
    // Get date range
    const dates = [];
    dayIndices.forEach(dayIndex => {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + dayIndex);
        dates.push(date);
    });
    
    const dateRange = dates.length === 1 
        ? dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : `${dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dates[dates.length-1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    return { days, dayIndices, timeStart, timeEnd, minTime, maxTime, dates, dateRange };
}

// Close class modal
window.closeClassModal = function() {
    document.getElementById('class-modal').classList.remove('active');
    
    // Clear selections
    document.querySelectorAll('.class-cell.selecting').forEach(cell => {
        cell.classList.remove('selecting');
    });
    selectedCells.clear();
};

// Save class block to Supabase
window.saveClassBlock = async function() {
    const subject = document.getElementById('class-subject').value.trim();
    const faculty = document.getElementById('class-faculty').value.trim();
    const startTime = document.getElementById('class-start-time').value;
    const endTime = document.getElementById('class-end-time').value;
    const startDateStr = document.getElementById('class-start-date').value;
    const endDateStr = document.getElementById('class-end-date').value;
    
    if (!subject || !startTime || !endTime) {
        alert('Please fill all required fields.');
        return;
    }
    
    const selection = parseSelection();
    const saveBtn = event.target;
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
    
    try {
        let datesToApply = [];
        if (startDateStr && endDateStr) {
            const currentDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);
            while (currentDate <= endDate) {
                const dayOfWeek = (currentDate.getDay() + 6) % 7;
                if (selection.dayIndices.includes(dayOfWeek)) {
                    datesToApply.push(new Date(currentDate));
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else {
            datesToApply = selection.dates;
        }

        const classesToInsert = datesToApply.map(date => {
            const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(date.getDay() + 6) % 7];
            return {
                year: currentYear,
                section: currentSection,
                date: formatDate(date),
                day: dayName,
                subject: subject,
                faculty: faculty || 'TBA',
                start_time: startTime,
                end_time: endTime,
                start_hour: parseFloat(startTime.split(':')[0]),
                end_hour: parseFloat(endTime.split(':')[0])
            };
        });

        const { error } = await supabaseClient.from('unified_schedules').insert(classesToInsert);

        if (error) throw error;

        closeClassModal();
        loadScheduleData();
        showNotification(`✅ Class created for ${datesToApply.length} day(s)!`, 'success');
    } catch (error) {
        console.error('Error saving class:', error);
        showNotification(`❌ Error saving class: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Class';
    }
};

// Render weekly schedule
function renderWeeklySchedule() {
    // Update date headers
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    
    days.forEach((dayName, dayIndex) => {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + dayIndex);
        
        const dateEl = document.querySelector(`.day-date[data-day="${dayIndex}"]`);
        if (dateEl) {
            dateEl.textContent = date.getDate();
            
            // Highlight today
            const header = dateEl.closest('.day-header');
            if (date.toDateString() === today.toDateString()) {
                header.classList.add('today');
            } else {
                header.classList.remove('today');
            }
        }
    });
    
    // Clear all cells
    document.querySelectorAll('.class-cell').forEach(cell => {
        if (!cell.classList.contains('selecting')) {
            cell.className = 'class-cell';
            cell.innerHTML = '';
            delete cell.dataset.classId;
        }
    });
    
    // Render classes with new time format
    scheduleData.forEach(classInfo => {
        const classDate = new Date(classInfo.date);
        const dayIndex = (classDate.getDay() + 6) % 7; // Convert to Monday=0
        
        // Check if class is in current week
        if (classDate >= currentWeekStart) {
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            if (classDate <= weekEnd && dayIndex < 6) {
                // Calculate which cells this class spans
                const startHour = parseFloat(classInfo.start_time.split(':')[0]);
                const endHour = parseFloat(classInfo.end_time.split(':')[0]);
                
                // Find cells in time range
                for (let hour = Math.floor(startHour); hour < Math.ceil(endHour); hour++) {
                    const timeSlot = hour - 9; // 9 AM = slot 0
                    if (timeSlot >= 0 && timeSlot < 8) {
                        const cell = document.querySelector(`[data-day="${dayIndex}"][data-time="${timeSlot}"]`);
                        if (cell && !cell.classList.contains('selecting')) {
                            cell.classList.add('has-class');
                            cell.dataset.classId = classInfo.id;
                            cell.innerHTML = `
                                <div class="class-content">
                                    <div class="class-subject">${classInfo.subject}</div>
                                    <div class="class-faculty">${classInfo.faculty || 'TBA'}</div>
                                    <div style="font-size: 11px; color: #718096; margin-top: 2px;">${classInfo.startTime} - ${classInfo.endTime}</div>
                                </div>
                            `;
                        }
                    }
                }
            }
        }
    });
}

// Render monthly calendar
function renderMonthlyCalendar() {
    const calendar = document.getElementById('monthly-calendar');
    calendar.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'calendar-grid';
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        header.appendChild(dayHeader);
    });
    calendar.appendChild(header);
    
    // Create days grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get first day (Monday = 0)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    // Previous month days
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        grid.appendChild(emptyDay);
    }
    
    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const dayClasses = scheduleData.filter(c => c.date === dateStr);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        if (date.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }
        
        dayDiv.innerHTML = `<div class="calendar-date">${day}</div>`;
        
        const classesDiv = document.createElement('div');
        classesDiv.className = 'calendar-classes';
        
        // Group classes by subject
        const grouped = {};
        dayClasses.forEach(c => {
            if (!grouped[c.subject]) {
                grouped[c.subject] = [];
            }
            grouped[c.subject].push(c);
        });
        
        Object.keys(grouped).slice(0, 3).forEach(subject => {
            const item = document.createElement('div');
            item.className = 'calendar-class-item';
            item.textContent = subject;
            item.title = `${subject} - ${grouped[subject][0].faculty || 'TBA'}`;
            classesDiv.appendChild(item);
        });
        
        dayDiv.appendChild(classesDiv);
        
        dayDiv.addEventListener('click', () => {
            openDayModal(date);
        });
        
        grid.appendChild(dayDiv);
    }
    
    calendar.appendChild(grid);
}

// Open edit modal
function openEditModal(classInfo) {
    editingClassId = classInfo.id;
    const modal = document.getElementById('edit-modal');
    
    document.getElementById('edit-subject').value = classInfo.subject;
    document.getElementById('edit-faculty').value = classInfo.faculty || '';
    document.getElementById('edit-start-time').value = classInfo.startTime;
    document.getElementById('edit-end-time').value = classInfo.endTime;
    document.getElementById('edit-date').value = `${classInfo.date} (${classInfo.day})`;
    
    modal.classList.add('active');
}

// Close edit modal
window.closeEditModal = function() {
    document.getElementById('edit-modal').classList.remove('active');
    editingClassId = null;
};

// Update class block
window.updateClassBlock = async function() {
    const subject = document.getElementById('edit-subject').value.trim();
    const faculty = document.getElementById('edit-faculty').value.trim();
    const startTime = document.getElementById('edit-start-time').value;
    const endTime = document.getElementById('edit-end-time').value;
    
    if (!subject) {
        alert('Please enter subject name');
        return;
    }
    
    const updateBtn = event.target;
    updateBtn.disabled = true;
    updateBtn.textContent = '⏳ Updating...';
    
    try {
        const classIndex = scheduleData.findIndex(c => c.id === editingClassId);
        if (classIndex !== -1) {
            scheduleData[classIndex].subject = subject;
            scheduleData[classIndex].faculty = faculty || 'TBA';
            scheduleData[classIndex].startTime = startTime;
            scheduleData[classIndex].endTime = endTime;
            
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            scheduleData[classIndex].startHour = startHour + startMin / 60;
            scheduleData[classIndex].endHour = endHour + endMin / 60;
            
            // Update in Firestore if it has a firestoreId
            if (scheduleData[classIndex].firestoreId) {
                const docRef = doc(db, 'unified_schedules', scheduleData[classIndex].firestoreId);
                await updateDoc(docRef, {
                    subject: subject,
                    faculty: faculty || 'TBA',
                    startTime: startTime,
                    endTime: endTime,
                    startHour: scheduleData[classIndex].startHour,
                    endHour: scheduleData[classIndex].endHour
                });
            }
        }
        
        closeEditModal();
        renderWeeklySchedule();
        showNotification('✅ Class updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating class:', error);
        showNotification('❌ Error updating class', 'error');
    } finally {
        updateBtn.disabled = false;
        updateBtn.textContent = '✅ Update';
    }
};

// Delete class block
window.deleteClassBlock = async function() {
    if (!confirm('Delete this class? This action cannot be undone.')) return;
    
    const deleteBtn = event.target;
    deleteBtn.disabled = true;
    deleteBtn.textContent = '⏳ Deleting...';
    
    try {
        const classIndex = scheduleData.findIndex(c => c.id === editingClassId);
        if (classIndex !== -1) {
            // Delete from Firestore if it has a firestoreId
            if (scheduleData[classIndex].firestoreId) {
                const docRef = doc(db, 'unified_schedules', scheduleData[classIndex].firestoreId);
                await deleteDoc(docRef);
            }
            
            scheduleData = scheduleData.filter(c => c.id !== editingClassId);
        }
        
        closeEditModal();
        renderWeeklySchedule();
        showNotification('🗑️ Class deleted successfully!', 'warning');
    } catch (error) {
        console.error('Error deleting class:', error);
        showNotification('❌ Error deleting class', 'error');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.textContent = '🗑️ Delete';
    }
};

// Save all schedules to Firestore
window.saveAllSchedules = async function() {
    if (scheduleData.length === 0) {
        alert('No classes to save!');
        return;
    }
    
    const saveBtn = event.target;
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
    
    try {
        // Delete existing schedules for this year/section
        const q = query(
            collection(db, 'unified_schedules'),
            where('year', '==', currentYear),
            where('section', '==', currentSection)
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
            savePromises.push(addDoc(collection(db, 'unified_schedules'), dataToSave));
        });
        
        await Promise.all(savePromises);
        
        showNotification(`✅ Saved ${scheduleData.length} classes successfully!`, 'success');
    } catch (error) {
        console.error('Error saving schedules:', error);
        showNotification('❌ Error saving schedules', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save All Changes';
    }
};

// Open day modal (when clicking date in month view)
window.openDayModal = function(date) {
    selectedDayDate = new Date(date);
    const modal = document.getElementById('day-modal');
    const dateStr = formatDate(selectedDayDate);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDayDate.getDay()];
    
    document.getElementById('day-modal-title').textContent = `📅 ${dayName}, ${selectedDayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    
    // Get classes for this day
    const dayClasses = scheduleData.filter(c => c.date === dateStr);
    const scheduleList = document.getElementById('day-schedule-list');
    
    if (dayClasses.length === 0) {
        scheduleList.innerHTML = '<div class="no-classes-msg">📚 No classes scheduled for this day</div>';
    } else {
        // Sort by start time
        dayClasses.sort((a, b) => {
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });
        
        scheduleList.innerHTML = dayClasses.map(cls => `
            <div class="day-class-item">
                <div class="day-class-info">
                    <div class="day-class-subject">${cls.subject}</div>
                    <div class="day-class-faculty">${cls.faculty || 'TBA'}</div>
                    <div class="day-class-time">⏰ ${cls.startTime} - ${cls.endTime}</div>
                </div>
                <div class="day-class-actions">
                    <button onclick="editClassFromDay('${cls.id}')">✏️ Edit</button>
                    <button onclick="deleteClassFromDay('${cls.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    // Clear add form
    document.getElementById('day-subject').value = '';
    document.getElementById('day-faculty').value = '';
    document.getElementById('day-start-time').value = '09:00';
    document.getElementById('day-end-time').value = '10:00';
    
    modal.classList.add('active');
};

// Close day modal
window.closeDayModal = function() {
    document.getElementById('day-modal').classList.remove('active');
    selectedDayDate = null;
};

// Add class from day modal
window.addClassFromDayModal = async function() {
    const subject = document.getElementById('day-subject').value.trim();
    const faculty = document.getElementById('day-faculty').value.trim();
    const startTime = document.getElementById('day-start-time').value;
    const endTime = document.getElementById('day-end-time').value;
    
    if (!subject) {
        alert('Please enter subject name');
        return;
    }
    
    if (!startTime || !endTime) {
        alert('Please select time range');
        return;
    }
    
    const addBtn = event.target;
    addBtn.disabled = true;
    addBtn.textContent = '⏳ Adding...';
    
    try {
        const dateStr = formatDate(selectedDayDate);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDayDate.getDay()];
        
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        const classData = {
            id: `${dateStr}-${startTime.replace(':', '')}-${Date.now()}-${Math.random()}`,
            year: currentYear,
            section: currentSection,
            date: dateStr,
            day: dayName,
            subject: subject,
            faculty: faculty || 'TBA',
            startTime: startTime,
            endTime: endTime,
            startHour: startHour + startMin / 60,
            endHour: endHour + endMin / 60,
            createdAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'unified_schedules'), classData);
        scheduleData.push(classData);
        
        showNotification('✅ Class added successfully!', 'success');
        
        // Refresh the day modal
        openDayModal(selectedDayDate);
    } catch (error) {
        console.error('Error adding class:', error);
        showNotification('❌ Error adding class', 'error');
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = '➕ Add Class';
    }
};

// Edit class from day modal
window.editClassFromDay = function(classId) {
    const classInfo = scheduleData.find(c => c.id === classId);
    if (classInfo) {
        closeDayModal();
        openEditModal(classInfo);
    }
};

// Delete class from day modal
window.deleteClassFromDay = async function(classId) {
    if (!confirm('Delete this class?')) return;
    
    try {
        const classIndex = scheduleData.findIndex(c => c.id === classId);
        if (classIndex !== -1) {
            if (scheduleData[classIndex].firestoreId) {
                const docRef = doc(db, 'unified_schedules', scheduleData[classIndex].firestoreId);
                await deleteDoc(docRef);
            }
            scheduleData = scheduleData.filter(c => c.id !== classId);
        }
        
        showNotification('🗑️ Class deleted!', 'warning');
        openDayModal(selectedDayDate); // Refresh
    } catch (error) {
        console.error('Error deleting class:', error);
        showNotification('❌ Error deleting class', 'error');
    }
};

// Utility functions
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : type === 'warning' ? '#ed8936' : '#667eea'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        font-size: 15px;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeSchedules) unsubscribeSchedules();
});
