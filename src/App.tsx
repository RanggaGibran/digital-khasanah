import { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import AuthPage from './components/AuthPage';
import FileManager from './components/FileManager';
import Header from './components/Header';
import { auth } from './firebase';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'An error occurred during signup.'
      };
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'An error occurred during login.'
      };
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'An error occurred during logout.'
      };
    }
  };  if (loading) {
    return (
      <div className="app-loading">
        <div className="particles-bg">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 15}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>
        <div className="loading-container">
          <div className="logo-loading">
            <svg width="80" height="80" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <div className="spinner-large"></div>
          <h3 style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Loading Digital Khasanah...
          </h3>
          <p>🔐 Initializing secure environment</p>
          <div className="loading-features">
            <div className="feature-item">⚡ Rust-powered encryption</div>
            <div className="feature-item">🛡️ Zero-knowledge architecture</div>
            <div className="feature-item">☁️ Secure cloud storage</div>
          </div>
        </div>
      </div>
    );
  }  return (
    <ThemeProvider>
      <div className="app-container">
        {/* Background Particles */}
        <div className="particles-bg">
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 25}s`,
                animationDuration: `${20 + Math.random() * 15}s`
              }}
            />
          ))}
        </div>
        
        <Header user={user} onLogout={handleLogout} />
        
        <main className="main-content">
          {user ? (
            <FileManager user={user} />
          ) : (
            <AuthPage onLogin={handleLogin} onSignUp={handleSignUp} />
          )}
        </main>
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-info">
            <p>© 2025 Digital Khasanah - Your Secure Digital Vault</p>
            <p className="footer-subtitle">End-to-End Encryption • Zero-Knowledge Architecture</p>
          </div>
          <div className="footer-features">
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Rust-Powered Encryption
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              WebAssembly Performance
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
              </svg>
              Firebase Cloud Storage
            </div>
          </div>
        </div>      </footer>
    </div>
    </ThemeProvider>
  );
}

export default App;
