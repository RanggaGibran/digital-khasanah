import React, { useState, useEffect } from 'react';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onSignUp }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [typedText, setTypedText] = useState('');

  const welcomeText = "Your secure file vault with Rust-powered encryption";

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < welcomeText.length) {
        setTypedText(welcomeText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const validateForm = () => {
    setError(null);
    
    if (!email || !password) {
      setError('Email and password are required.');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }

    // Password strength validation for signup
    if (!isLogin) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return false;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = isLogin 
        ? await onLogin(email, password)
        : await onSignUp(email, password);
        
      if (!result.success) {
        setError(result.error || 'Authentication failed.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">      <div className="auth-card animate-fade-in">
        <div className="auth-header">          <div className="auth-logo">
            <svg width="64" height="64" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="12" fill="url(#gradient)"/>
              <path d="M20 12C23.314 12 26 14.686 26 18V20H28C29.105 20 30 20.895 30 22V30C30 31.105 29.105 32 28 32H12C10.895 32 10 31.105 10 30V22C10 20.895 10.895 20 12 20H14V18C14 14.686 16.686 12 20 12ZM20 14C17.79 14 16 15.79 16 18V20H24V18C24 15.79 22.21 14 20 14ZM20 24C18.895 24 18 24.895 18 26C18 27.105 18.895 28 20 28C21.105 28 22 27.105 22 26C22 24.895 21.105 24 20 24Z" fill="white"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#667eea"/>
                  <stop offset="0.5" stopColor="#764ba2"/>
                  <stop offset="1" stopColor="#f093fb"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2 style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Welcome to Digital Khasanah
          </h2>
          <p className="typing-text">
            {typedText}
            <span className="cursor">|</span>
          </p>
          <div className="auth-features">
            <div className="feature-badge">🔐 Zero-Knowledge</div>
            <div className="feature-badge">⚡ Rust-Powered</div>
            <div className="feature-badge">☁️ Secure Cloud</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
            type="button"
          >
            Sign In
          </button>
          <button 
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
            type="button"
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-container">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="status-message error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div className="spinner"></div>
                {isLogin ? 'Signing In...' : 'Creating Account...'}
              </span>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={toggleMode}>
            {isLogin ? 'Sign up here' : 'Sign in here'}
          </button>
        </div>

        {isLogin && (
          <div className="auth-divider">
            <span>Secure • Encrypted • Private</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
