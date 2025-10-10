// Backend API Configuration
const BACKEND_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',  // Change this to your backend URL
    ENDPOINTS: {
        ADD_CLASS: '/add-class',
        DELETE_CLASS: '/delete-class',
        VIEW_SCHEDULE: '/view-schedule'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BACKEND_CONFIG;
}
