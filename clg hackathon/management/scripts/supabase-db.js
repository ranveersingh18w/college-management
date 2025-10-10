// ============================================
// SUPABASE DATABASE OPERATIONS
// ============================================

// Initialize Supabase
let supabase = null;

async function initializeSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase library not loaded');
        return false;
    }
    
    supabase = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
    );
    
    console.log('✅ Supabase initialized');
    return true;
}

// ============================================
// TABLE: unified_schedules
// Columns: id, year, section, subject, faculty, 
//          start_time, end_time, start_hour, end_hour,
//          date, day, created_at
// ============================================

// CREATE: Add a new class to Supabase
async function addClassToSupabase(classData) {
    try {
        console.log('📝 Adding class to Supabase:', classData);
        
        const { data, error } = await supabase
            .from('unified_schedules')
            .insert([{
                year: classData.year,
                section: classData.section,
                subject: classData.subject,
                faculty: classData.faculty || 'TBA',
                start_time: classData.startTime,
                end_time: classData.endTime,
                start_hour: classData.startHour,
                end_hour: classData.endHour,
                date: classData.date,
                day: classData.day,
                created_at: new Date().toISOString()
            }])
            .select();
        
        if (error) {
            console.error('❌ Supabase insert error:', error);
            throw error;
        }
        
        console.log('✅ Class added to Supabase:', data);
        return data;
    } catch (error) {
        console.error('❌ Error adding class to Supabase:', error);
        throw error;
    }
}

// READ: Fetch all classes for a specific year and section
async function fetchClassesFromSupabase(year, section) {
    try {
        console.log(`📊 Fetching classes from Supabase: ${year}, ${section}`);
        
        const { data, error } = await supabase
            .from('unified_schedules')
            .select('*')
            .eq('year', year)
            .eq('section', section)
            .order('date', { ascending: true })
            .order('start_hour', { ascending: true });
        
        if (error) {
            console.error('❌ Supabase fetch error:', error);
            throw error;
        }
        
        console.log(`✅ Fetched ${data.length} classes from Supabase`);
        return data;
    } catch (error) {
        console.error('❌ Error fetching classes from Supabase:', error);
        throw error;
    }
}

// READ: Fetch all classes (for AI context)
async function fetchAllClassesFromSupabase() {
    try {
        console.log('📊 Fetching all classes from Supabase for AI context');
        
        const { data, error } = await supabase
            .from('unified_schedules')
            .select('*')
            .order('date', { ascending: true });
        
        if (error) {
            console.error('❌ Supabase fetch error:', error);
            throw error;
        }
        
        console.log(`✅ Fetched ${data.length} total classes from Supabase`);
        return data;
    } catch (error) {
        console.error('❌ Error fetching all classes from Supabase:', error);
        return [];
    }
}

// UPDATE: Update a class in Supabase
async function updateClassInSupabase(id, updates) {
    try {
        console.log(`📝 Updating class in Supabase: ID ${id}`, updates);
        
        const updateData = {};
        if (updates.subject) updateData.subject = updates.subject;
        if (updates.faculty) updateData.faculty = updates.faculty;
        if (updates.startTime) {
            updateData.start_time = updates.startTime;
            updateData.start_hour = parseInt(updates.startTime.split(':')[0]);
        }
        if (updates.endTime) {
            updateData.end_time = updates.endTime;
            updateData.end_hour = parseInt(updates.endTime.split(':')[0]);
        }
        if (updates.date) updateData.date = updates.date;
        if (updates.day) updateData.day = updates.day;
        
        const { data, error } = await supabase
            .from('unified_schedules')
            .update(updateData)
            .eq('id', id)
            .select();
        
        if (error) {
            console.error('❌ Supabase update error:', error);
            throw error;
        }
        
        console.log('✅ Class updated in Supabase:', data);
        return data;
    } catch (error) {
        console.error('❌ Error updating class in Supabase:', error);
        throw error;
    }
}

// DELETE: Delete specific class(es) from Supabase
async function deleteClassFromSupabase(filters) {
    try {
        console.log('🗑️ Deleting class from Supabase:', filters);
        
        let query = supabase.from('unified_schedules').delete();
        
        // Apply filters
        if (filters.year) query = query.eq('year', filters.year);
        if (filters.section) query = query.eq('section', filters.section);
        if (filters.subject) query = query.eq('subject', filters.subject);
        if (filters.date && filters.date !== '*') query = query.eq('date', filters.date);
        if (filters.time && filters.time !== '*') query = query.eq('start_time', filters.time);
        if (filters.id) query = query.eq('id', filters.id);
        
        const { data, error } = await query.select();
        
        if (error) {
            console.error('❌ Supabase delete error:', error);
            throw error;
        }
        
        console.log(`✅ Deleted ${data.length} classes from Supabase`);
        return data;
    } catch (error) {
        console.error('❌ Error deleting class from Supabase:', error);
        throw error;
    }
}

// DELETE: Clear all classes for year/section
async function clearAllClassesInSupabase(year, section) {
    try {
        console.log(`🗑️ Clearing all classes in Supabase: ${year}, ${section}`);
        
        const { data, error } = await supabase
            .from('unified_schedules')
            .delete()
            .eq('year', year)
            .eq('section', section)
            .select();
        
        if (error) {
            console.error('❌ Supabase clear error:', error);
            throw error;
        }
        
        console.log(`✅ Cleared ${data.length} classes from Supabase`);
        return data;
    } catch (error) {
        console.error('❌ Error clearing classes from Supabase:', error);
        throw error;
    }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

let realtimeChannel = null;

// Subscribe to real-time changes
function subscribeToClassUpdates(year, section, callback) {
    if (!supabase) {
        console.error('❌ Supabase not initialized');
        return null;
    }
    
    console.log(`🔔 Subscribing to real-time updates: ${year}, ${section}`);
    
    // Unsubscribe from previous channel
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }
    
    // Subscribe to changes
    realtimeChannel = supabase
        .channel('unified_schedules_changes')
        .on(
            'postgres_changes',
            {
                event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'unified_schedules',
                filter: `year=eq.${year}`
            },
            (payload) => {
                console.log('🔔 Real-time update received:', payload);
                
                // Only trigger callback if the section matches
                if (payload.new?.section === section || payload.old?.section === section) {
                    callback(payload);
                }
            }
        )
        .subscribe();
    
    return realtimeChannel;
}

// Unsubscribe from real-time updates
function unsubscribeFromClassUpdates() {
    if (realtimeChannel) {
        console.log('🔕 Unsubscribing from real-time updates');
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Convert Supabase data format to app format
function convertSupabaseToAppFormat(supabaseData) {
    return supabaseData.map(item => ({
        id: item.id,
        year: item.year,
        section: item.section,
        subject: item.subject,
        faculty: item.faculty,
        startTime: item.start_time,
        endTime: item.end_time,
        startHour: item.start_hour,
        endHour: item.end_hour,
        date: item.date,
        day: item.day,
        createdAt: item.created_at
    }));
}

// Export functions
window.supabaseDB = {
    initialize: initializeSupabase,
    addClass: addClassToSupabase,
    fetchClasses: fetchClassesFromSupabase,
    fetchAllClasses: fetchAllClassesFromSupabase,
    updateClass: updateClassInSupabase,
    deleteClass: deleteClassFromSupabase,
    clearAll: clearAllClassesInSupabase,
    subscribe: subscribeToClassUpdates,
    unsubscribe: unsubscribeFromClassUpdates,
    convertToAppFormat: convertSupabaseToAppFormat
};
