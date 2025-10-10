// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBufpAFoRyTsHfyx49_YUpzikj-2RFDSZM",
    authDomain: "campusgeofence.firebaseapp.com",
    projectId: "campusgeofence",
    storageBucket: "campusgeofence.firebasestorage.app",
    messagingSenderId: "905633639556",
    appId: "1:905633639556:web:444a86581e530e0f57a6d1",
    measurementId: "G-3X1WR7W1SB"
};

// Initialize Firebase (NO AUTH - Local Authentication)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
