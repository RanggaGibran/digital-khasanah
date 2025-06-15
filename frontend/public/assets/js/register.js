// Import Firebase modules
import { createUserWithEmailAndPassword, sendEmailVerification } from './firebase-config.js';
import { auth } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
  const registerForm = document.getElementById('registerForm');
  
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegistration);
    
    // Password strength meter
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');
    
    if (passwordInput) {
      passwordInput.addEventListener('input', updatePasswordStrength);
    }
  }
  
  async function handleRegistration(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const errorAlert = document.querySelector('.form-alert--error');
    
    // Validate form fields
    if (!email || !password || !confirmPassword) {
      showError(errorAlert, 'Mohon isi semua kolom.');
      return;
    }
    
    if (password !== confirmPassword) {
      showError(errorAlert, 'Kata sandi tidak cocok.');
      return;
    }
    
    if (!isStrongPassword(password)) {
      showError(errorAlert, 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter dengan kombinasi huruf besar, huruf kecil, angka, dan simbol.');
      return;
    }
    
    if (!agreeTerms) {
      showError(errorAlert, 'Anda harus menyetujui Syarat & Ketentuan untuk melanjutkan.');
      return;
    }
    
    // Hide previous error messages
    hideError(errorAlert);
    
    // Show loading state
    const submitButton = registerForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = 'Memproses...';
    
    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Cache user data
      auth.cacheUserData(user);
      
      // Redirect to onboarding page
      window.location.href = '/onboarding.html';
    } catch (error) {
      console.error('Registration error:', error);
      
      // Show appropriate error message based on error code
      let errorMessage = 'Terjadi kesalahan saat pendaftaran.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email ini sudah digunakan. Silakan gunakan email lain atau masuk jika Anda sudah memiliki akun.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format email tidak valid.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Pendaftaran dengan email dan kata sandi tidak diaktifkan.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol.';
          break;
      }
      
      showError(errorAlert, errorMessage);
      submitButton.disabled = false;
      submitButton.innerHTML = 'Daftar';
    }
  }
  
  function updatePasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');
    
    if (!password) {
      strengthMeter.className = 'strength-meter';
      strengthText.textContent = 'Kekuatan kata sandi: ';
      return;
    }
    
    const { score, feedback } = evaluatePasswordStrength(password);
    
    strengthMeter.className = 'strength-meter';
    
    if (score < 2) {
      strengthMeter.classList.add('weak');
      strengthText.textContent = 'Kekuatan kata sandi: Lemah';
    } else if (score < 4) {
      strengthMeter.classList.add('medium');
      strengthText.textContent = 'Kekuatan kata sandi: Sedang';
    } else {
      strengthMeter.classList.add('strong');
      strengthText.textContent = 'Kekuatan kata sandi: Kuat';
    }
  }
  
  function evaluatePasswordStrength(password) {
    // Simple password strength evaluation
    // In production, consider using a library like zxcvbn
    
    let score = 0;
    const feedback = {};
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1; // Has uppercase
    if (/[a-z]/.test(password)) score += 1; // Has lowercase
    if (/[0-9]/.test(password)) score += 1; // Has number
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // Has special char
    
    // Deductions for common patterns
    if (/^123|password|qwerty|admin/i.test(password)) {
      score = Math.max(0, score - 2);
      feedback.warning = 'Kata sandi terlalu umum.';
    }
    
    return { score, feedback };
  }
  
  function isStrongPassword(password) {
    return evaluatePasswordStrength(password).score >= 4;
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
