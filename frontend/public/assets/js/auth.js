// Import Firebase modules
import { 
  auth as firebaseAuth,
  onAuthStateChanged,
  signOut
} from './firebase-config.js';

// Constants
const API_BASE_URL = 'http://localhost:3000/api';
const USER_KEY = 'dk_user_cache';

// Common auth functions
const auth = {
  /**
   * Get the current Firebase user
   * @returns {Promise<firebase.User|null>} The current user or null
   */
  getCurrentUser: function() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  },
  
  /**
   * Cache user data for quick access
   * @param {Object} user - The Firebase user object
   */
  cacheUserData: function(user) {
    if (user) {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    }
  },
  
  /**
   * Get cached user data
   * @returns {Object|null} The cached user data or null
   */
  getCachedUserData: function() {
    const userJson = localStorage.getItem(USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  },
  
  /**
   * Get Firebase ID token for the current user
   * @returns {Promise<string|null>} The ID token or null
   */
  getIdToken: async function() {
    const user = await this.getCurrentUser();
    if (user) {
      return user.getIdToken();
    }
    return null;
  },
  
  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} Whether the user is authenticated
   */
  isAuthenticated: async function() {
    const user = await this.getCurrentUser();
    return !!user;
  },
  
  /**
   * Sign out the current user
   */
  logout: async function() {
    try {
      await signOut(firebaseAuth);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
  
  /**
   * Redirect to dashboard if authenticated
   */
  redirectIfAuthenticated: async function() {
    if (await this.isAuthenticated()) {
      window.location.href = '/dashboard.html';
    }
  },
  
  /**
   * Redirect to login if not authenticated
   */
  requireAuth: async function() {
    if (!(await this.isAuthenticated())) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }
  },
  
  /**
   * Make authenticated API request
   * @param {string} endpoint - The API endpoint
   * @param {object} options - Request options
   * @returns {Promise} The fetch promise
   */
  apiRequest: async function(endpoint, options = {}) {
    const token = await this.getIdToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token might be expired, try to refresh
          const newToken = await this.getIdToken(true);
          if (newToken !== token) {
            // Token was refreshed, retry request
            return this.apiRequest(endpoint, options);
          }
          this.logout();
        }
        throw new Error(data.message || 'Error making request');
      }
      
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }
};

// On page load - Check authentication status for appropriate pages
document.addEventListener('DOMContentLoaded', function() {
  const path = window.location.pathname;
  
  // Listen for auth state changes
  onAuthStateChanged(firebaseAuth, (user) => {
    if (user) {
      auth.cacheUserData(user);
    } else {
      localStorage.removeItem(USER_KEY);
    }
  });
  
  // If on login or register page, redirect if already authenticated
  if (path.includes('login.html') || path.includes('register.html')) {
    auth.redirectIfAuthenticated();
  }
  
  // If on dashboard or other protected pages, require auth
  if (path.includes('dashboard.html') || path.includes('vault.html') || path.includes('settings.html')) {
    auth.requireAuth();
  }
});
