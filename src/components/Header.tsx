import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  user: User | null;
  onLogout: () => Promise<{ success: boolean; error?: string }>;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();
  
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onLogout();
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <div className="logo-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="12" fill="url(#gradient)"/>
              <path d="M20 12C23.314 12 26 14.686 26 18V20H28C29.105 20 30 20.895 30 22V30C30 31.105 29.105 32 28 32H12C10.895 32 10 31.105 10 30V22C10 20.895 10.895 20 12 20H14V18C14 14.686 16.686 12 20 12ZM20 14C17.79 14 16 15.79 16 18V20H24V18C24 15.79 22.21 14 20 14ZM20 24C18.895 24 18 24.895 18 26C18 27.105 18.895 28 20 28C21.105 28 22 27.105 22 26C22 24.895 21.105 24 20 24Z" fill="white"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#667eea"/>
                  <stop offset="1" stopColor="#764ba2"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="logo-text">
            <h1 className="logo-title">Digital Khasanah</h1>
            <p className="logo-subtitle">Secure File Vault with Rust-powered Encryption</p>
          </div>
        </div>          <div className="theme-toggle">
            <button 
              className={`theme-toggle-btn ${darkMode ? 'dark' : 'light'}`} 
              onClick={toggleDarkMode} 
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>

          {user && (
          <div className="user-section">
            <div className="notifications">
              <button className="notification-btn" aria-label="Notifications">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span className="notification-badge">2</span>
              </button>
            </div>
            
            <div className="user-info" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="user-avatar">
                <span className="avatar-text">{user.email?.[0]?.toUpperCase() || 'U'}</span>
                <div className="status-indicator"></div>
              </div>
              <div className="user-details">
                <span className="user-email">{user.email}</span>
                <span className="user-status">
                  <span className="status-dot"></span>
                  Online • Encrypted
                </span>
              </div>
              <svg className={`dropdown-arrow ${showUserMenu ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </div>
            
            {showUserMenu && (
              <div className="user-menu">
                <div className="menu-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Profile Settings
                </div>
                <div className="menu-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  Activity Log
                </div>
                <div className="menu-divider"></div>
                <div className="menu-item" onClick={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign Out
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
