// Import Firebase modules
import { signInWithEmailAndPassword } from './firebase-config.js';
import { auth } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const errorAlert = document.querySelector('.form-alert--error');
    
    // Validate form fields
    if (!email || !password) {
      showError(errorAlert, 'Mohon isi semua kolom.');
      return;
    }
    
    // Hide previous error messages
    hideError(errorAlert);
    
    // Show loading state
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = 'Memproses...';
    
    try {
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Cache user data
      auth.cacheUserData(user);
      
      // Get redirect URL from query parameters or default to dashboard
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect') || '/dashboard.html';
      
      // Redirect to dashboard or requested page
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Login error:', error);
      
      // Show appropriate error message based on error code
      let errorMessage = 'Terjadi kesalahan saat login.';
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Email atau kata sandi yang Anda masukkan salah.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format email tidak valid.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Akun Anda telah dinonaktifkan.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Terlalu banyak percobaan gagal. Coba lagi nanti.';
          break;
      }
      
      showError(errorAlert, errorMessage);
      submitButton.disabled = false;
      submitButton.innerHTML = 'Masuk';
    }
  }
  
  function showError(element, message) {
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
    }
  }
  
  function hideError(element) {
    if (element) {
      element.style.display = 'none';
    }
  }
});
