import { db, storage } from './firebase.js';
import { 
    collection,
    doc, 
    setDoc, 
    getDoc,
    query,
    where,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Show/Hide Forms
window.showSignup = function() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
};

window.showLogin = function() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
};

// Photo Preview
document.getElementById('signup-photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('photo-preview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const rollNumber = document.getElementById('login-rollnumber').value.trim();
    const password = document.getElementById('login-password').value;
    
    showLoading(true);
    
    try {
        // Check for admin login
        if (rollNumber.toLowerCase() === 'admin' && password === 'admin') {
            // Admin login
            const adminData = {
                name: 'Administrator',
                rollNumber: 'admin',
                role: 'admin',
                photoURL: 'assets/images/avatar-placeholder.svg'
            };
            localStorage.setItem('userData', JSON.stringify(adminData));
            localStorage.setItem('userId', 'admin');
            localStorage.setItem('userRole', 'admin');
            window.location.href = 'admin.html';
            return;
        } else if (rollNumber === '001' && password === '001') {
            // Demo student login
            const studentData = {
                name: 'Demo Student',
                rollNumber: '001',
                role: 'student',
                photoURL: 'assets/images/avatar-placeholder.svg',
                year: '2',
                branch: 'CSE'
            };
            localStorage.setItem('userData', JSON.stringify(studentData));
            localStorage.setItem('userId', '001');
            localStorage.setItem('userRole', 'student');
            window.location.href = 'home.html';
            return;
        }
        
        // Student login - check in Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('rollNumber', '==', rollNumber));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('User not found. Please sign up first.');
        }
        
        let userData = null;
        let userId = null;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.password === password) {
                userData = data;
                userId = doc.id;
            }
        });
        
        if (!userData) {
            throw new Error('Incorrect password');
        }
        
        // Store user data in localStorage
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('userId', userId);
        localStorage.setItem('userRole', 'student');
        
        // Redirect to home
        window.location.href = 'home.html';
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    } finally {
        showLoading(false);
    }
});

// Signup Form Handler
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value.trim();
    const rollNumber = document.getElementById('signup-rollnumber').value.trim();
    const year = document.getElementById('signup-year').value;
    const branch = document.getElementById('signup-branch').value;
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const photoFile = document.getElementById('signup-photo').files[0];
    
    // Validate admin credentials not used
    if (rollNumber.toLowerCase() === 'admin') {
        alert('This roll number is reserved. Please use a different one.');
        return;
    }
    
    showLoading(true);
    
    try {
        // Check if roll number already exists
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('rollNumber', '==', rollNumber));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            throw new Error('Roll number already exists. Please login instead.');
        }
        
        // Generate unique user ID
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        let photoURL = 'assets/images/avatar-placeholder.svg';
        
        // Upload photo if provided
        if (photoFile) {
            const storageRef = ref(storage, `profile_photos/${userId}`);
            await uploadBytes(storageRef, photoFile);
            photoURL = await getDownloadURL(storageRef);
        }
        
        // Save user data to Firestore
        const userData = {
            name: name,
            rollNumber: rollNumber,
            year: year,
            branch: branch,
            email: email,
            password: password, // In production, hash this!
            photoURL: photoURL,
            role: 'student',
            createdAt: new Date().toISOString(),
            attendance: 0,
            totalClasses: 0
        };
        
        await setDoc(doc(db, 'users', userId), userData);
        
        // Store in localStorage
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('userId', userId);
        localStorage.setItem('userRole', 'student');
        
        alert('Account created successfully!');
        window.location.href = 'home.html';
        
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed: ' + error.message);
    } finally {
        showLoading(false);
    }
});

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}
