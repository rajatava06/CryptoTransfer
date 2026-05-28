import React, { useState } from 'react';
import { HelpCircle, Menu, X, User } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, setContactOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="app-header" style={{ position: 'relative' }}>
      <div className="container header-content">
        <div className="logo" id="app-logo" onClick={() => setActiveTab('encrypt')}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="logo-icon"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          CryptoTransfer
        </div>

        {/* Desktop Header Navigation */}
        <div className="header-nav-desktop">
          <button
            type="button"
            className="tab-btn"
            style={{ 
              margin: 0, 
              padding: '0.3rem 0.75rem', 
              fontSize: '0.8rem',
              borderRadius: '100px',
              border: '1px solid var(--border-dim)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-secondary)'
            }}
            onClick={() => setContactOpen(true)}
            id="desktop-contact-btn"
          >
            <User size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.25rem' }} />
            Contact Developer
          </button>
          <button
            id="header-specs-btn"
            type="button"
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            style={{ 
              margin: 0, 
              padding: '0.3rem 0.75rem', 
              fontSize: '0.8rem',
              borderRadius: '100px',
              border: '1px solid var(--border-dim)',
              background: activeTab === 'info' ? 'linear-gradient(135deg, var(--cyan-dark), var(--purple-dark))' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === 'info' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
            onClick={() => setActiveTab('info')}
          >
            <HelpCircle size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.25rem' }} />
            Security Specs
          </button>
          <div className="header-status" id="header-status-badge">
            <span className="status-dot"></span>
            <span>Server Live</span>
          </div>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="header-nav-mobile">
          <div className="header-status" id="header-status-badge-mobile" style={{ marginRight: '0.5rem' }}>
            <span className="status-dot"></span>
            <span>Server Live</span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="hamburger-btn"
            aria-label="Toggle menu"
            id="hamburger-menu-toggle"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="mobile-menu-dropdown" id="mobile-navigation-dropdown">
          <button
            type="button"
            className="mobile-menu-item"
            onClick={() => {
              setContactOpen(true);
              setMenuOpen(false);
            }}
            id="mobile-contact-btn"
          >
            <User size={16} />
            Contact Developer
          </button>
          <button
            type="button"
            className={`mobile-menu-item ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('info');
              setMenuOpen(false);
            }}
            id="mobile-specs-btn"
          >
            <HelpCircle size={16} />
            Security Specs
          </button>
        </div>
      )}

    </header>
  );
}
