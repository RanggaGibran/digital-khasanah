// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "digital-khasanah.firebaseapp.com",
  projectId: "digital-khasanah",
  storageBucket: "digital-khasanah.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:00000000000000000000"
};

// Initialize Firebase services
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

// Auth state observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    console.log('User is signed in:', user.uid);
    
    // Get the current page path
    const path = window.location.pathname;
    
    // If on login or register page, redirect to dashboard
    if (path.includes('login.html') || path.includes('register.html') || path === '/') {
      window.location.href = '/dashboard.html';
    }
  } else {
    // User is signed out
    console.log('User is signed out');
    
    // Get the current page path
    const path = window.location.pathname;
    
    // If on protected pages, redirect to login
    if (path.includes('dashboard.html') || path.includes('vault.html') || path.includes('settings.html')) {
      window.location.href = '/login.html';
    }
  }
});

// Firebase Authentication functions
const firebaseAuth = {
  // Register a new user
  register: async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  // Login an existing user
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Logout the current user
  logout: async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  
  // Get the current user
  getCurrentUser: () => {
    return auth.currentUser;
  },
  
  // Get the current user's token
  getToken: async () => {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }
};

// Firebase Storage functions
const firebaseStorage = {
  // Upload a file to Firebase Storage
  uploadFile: async (file, path = null) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const filePath = path || `users/${user.uid}/${file.name}`;
      const storageRef = ref(storage, filePath);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        path: filePath,
        url: downloadURL
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },
  
  // Get download URL for a file
  getFileUrl: async (path) => {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Get URL error:', error);
      throw error;
    }
  },
  
  // Delete a file from Firebase Storage
  deleteFile: async (path) => {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }
};

// Export the Firebase services
export { firebaseAuth, firebaseStorage };
