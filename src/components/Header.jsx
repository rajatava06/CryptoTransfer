import React, { useState, useRef, useLayoutEffect } from 'react';
import { HelpCircle, Menu, X, User } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, setContactOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const headerNavRef = useRef(null);
  const specsDesktopRef = useRef(null);
  const [gliderStyle, setGliderStyle] = useState({ opacity: 0, width: 0, left: 0 });

  useLayoutEffect(() => {
    const nav = headerNavRef.current;
    const activeEl = activeTab === 'info' ? specsDesktopRef.current : null;
    if (!nav || !activeEl) {
      setGliderStyle(prev => ({ ...prev, opacity: 0 }));
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    setGliderStyle({
      opacity: 1,
      width: elRect.width,
      left: elRect.left - navRect.left,
      height: elRect.height,
    });
  }, [activeTab]);

  const touchStartX = useRef(null);
  const mobileTabs = ['encrypt', 'decrypt', 'p2p', 'ethernet', 'info'];

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 40) return; // ignore tiny drags
    const current = mobileTabs.indexOf(activeTab);
    if (dx < 0 && current < mobileTabs.length - 1) {
      setActiveTab(mobileTabs[current + 1]);
    } else if (dx > 0 && current > 0) {
      setActiveTab(mobileTabs[current - 1]);
    }
    touchStartX.current = null;
    setMenuOpen(false);
  };

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

        {/* Desktop Header Navigation — with glider */}
        <div className="header-nav-desktop" ref={headerNavRef} style={{ position: 'relative' }}>
          {/* Glider pill */}
          <span
            className="header-nav-glider"
            aria-hidden="true"
            style={{
              opacity: gliderStyle.opacity,
              width: gliderStyle.width,
              height: gliderStyle.height,
              transform: `translateX(${gliderStyle.left}px) translateY(-50%)`,
            }}
          />

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
              color: 'var(--text-secondary)',
              position: 'relative',
              zIndex: 1,
            }}
            onClick={() => setContactOpen(true)}
            id="desktop-contact-btn"
          >
            <User size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.25rem' }} />
            Contact Developer
          </button>

          <button
            id="header-specs-btn"
            ref={specsDesktopRef}
            type="button"
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            style={{
              margin: 0,
              padding: '0.3rem 0.75rem',
              fontSize: '0.8rem',
              borderRadius: '100px',
              border: '1px solid transparent',
              background: 'transparent',
              color: activeTab === 'info' ? 'var(--text-primary)' : 'var(--text-secondary)',
              position: 'relative',
              zIndex: 1,
              transition: 'color 0.3s ease',
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

      {/* Mobile Dropdown Menu — swipeable */}
      {menuOpen && (
        <div
          className="mobile-menu-dropdown"
          id="mobile-navigation-dropdown"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
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
