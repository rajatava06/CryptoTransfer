import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EncryptPanel from './components/EncryptPanel';
import DecryptPanel from './components/DecryptPanel';
import PeerSimulator from './components/PeerSimulator';
import InfoPanel from './components/InfoPanel';
import EthernetSimulator from './components/EthernetSimulator';
import { Lock, Unlock, Share2, HelpCircle, X, Network, User } from 'lucide-react';
import './App.css';

const TAB_ORDER = ['encrypt', 'decrypt', 'p2p', 'ethernet', 'info'];

export default function App() {
  const [activeTab, setActiveTab] = useState('encrypt');
  const [passwordKey, setPasswordKey] = useState('');
  const [toasts, setToasts] = useState([]);
  const [contactOpen, setContactOpen] = useState(false);

  // Auto-switch to decrypt if link contains a key hash
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('key=')) {
      setActiveTab('decrypt');
    }
  }, []);

  // ── Glider state for nav-tabs ──────────────────────────────────
  const navRef = useRef(null);
  const tabRefs = useRef({});
  const [glider, setGlider] = useState({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    const navEl = navRef.current;
    const activeEl = tabRefs.current[activeTab];
    if (!navEl || !activeEl) {
      // Tab not present in the nav-tabs (e.g. 'info' / Security Specs) — hide glider
      setGlider(prev => ({ ...prev, opacity: 0 }));
      return;
    }

    const navRect = navEl.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    setGlider({
      left: elRect.left - navRect.left + navEl.scrollLeft,
      width: elRect.width,
      height: elRect.height,
      opacity: 1,
    });
  }, [activeTab]);

  // ── Touch-swipe on main content (not the scrollable nav) ─────
  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);
  const swipeLocked = useRef(null); // 'h' | 'v' | null
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  useEffect(() => {
    const el = document.getElementById('swipe-zone');
    if (!el) return;

    const onStart = (e) => {
      swipeStartX.current = e.touches[0].clientX;
      swipeStartY.current = e.touches[0].clientY;
      swipeLocked.current = null;
    };

    const onMove = (e) => {
      if (!swipeStartX.current) return;
      const dx = e.touches[0].clientX - swipeStartX.current;
      const dy = e.touches[0].clientY - swipeStartY.current;

      // Lock direction on first significant movement
      if (!swipeLocked.current) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          swipeLocked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        }
      }
      // Block native scroll only when we've committed to horizontal
      if (swipeLocked.current === 'h') {
        e.preventDefault();
      }
    };

    const onEnd = (e) => {
      if (swipeLocked.current !== 'h' || swipeStartX.current === null) {
        swipeStartX.current = null;
        swipeStartY.current = null;
        swipeLocked.current = null;
        return;
      }
      const dx = e.changedTouches[0].clientX - swipeStartX.current;
      if (Math.abs(dx) < 50) {
        swipeStartX.current = null;
        swipeLocked.current = null;
        return;
      }
      const current = TAB_ORDER.indexOf(activeTabRef.current);
      if (dx < 0 && current < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[current + 1]);
      else if (dx > 0 && current > 0) setActiveTab(TAB_ORDER[current - 1]);
      swipeStartX.current = null;
      swipeStartY.current = null;
      swipeLocked.current = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, []);

  const addToast = (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => { removeToast(id); }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} setContactOpen={setContactOpen} />

      <main className="main-content">
        <div className="container">
          {/* Navigation Tabs — iOS-26 glider */}
          <nav
            className="nav-tabs"
            aria-label="Main Navigation"
            ref={navRef}
          >
            {/* Glider pill */}
            <span
              className="nav-glider"
              aria-hidden="true"
              style={{
                opacity: glider.opacity,
                width: glider.width,
                height: glider.height,
                transform: `translateX(${glider.left}px)`,
              }}
            />

            <button
              id="tab-encrypt-btn"
              type="button"
              ref={el => tabRefs.current['encrypt'] = el}
              className={`tab-btn ${activeTab === 'encrypt' ? 'active' : ''}`}
              onClick={() => setActiveTab('encrypt')}
            >
              <Lock size={16} />
              Encrypt
            </button>
            <button
              id="tab-decrypt-btn"
              type="button"
              ref={el => tabRefs.current['decrypt'] = el}
              className={`tab-btn ${activeTab === 'decrypt' ? 'active' : ''}`}
              onClick={() => setActiveTab('decrypt')}
            >
              <Unlock size={16} />
              Decrypt
            </button>
            <button
              id="tab-p2p-btn"
              type="button"
              ref={el => tabRefs.current['p2p'] = el}
              className={`tab-btn ${activeTab === 'p2p' ? 'active' : ''}`}
              onClick={() => setActiveTab('p2p')}
            >
              <Share2 size={16} />
              P2P Simulator
            </button>
            <button
              id="tab-ethernet-btn"
              type="button"
              ref={el => tabRefs.current['ethernet'] = el}
              className={`tab-btn ${activeTab === 'ethernet' ? 'active' : ''}`}
              onClick={() => setActiveTab('ethernet')}
            >
              <Network size={16} />
              Ethernet LAN
            </button>
          </nav>

          {/* Swipe hint dots — iOS page-control style, mobile only */}
          <div className="swipe-hint" style={{ display: 'none' }}>
            {TAB_ORDER.filter(tab => tab !== 'info').map((tab) => (
              <span
                key={tab}
                className={`swipe-hint-dot ${activeTab === tab ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Active Tab Panel — swipe zone */}
          <div
            id="swipe-zone"
            className="active-view-container"
            style={{ animation: 'fadeIn 0.3s', touchAction: 'pan-y pinch-zoom' }}
          >
            {activeTab === 'encrypt' && (
              <EncryptPanel
                passwordKey={passwordKey}
                setPasswordKey={setPasswordKey}
                addToast={addToast}
              />
            )}

            {activeTab === 'decrypt' && (
              <DecryptPanel
                addToast={addToast}
              />
            )}

            {activeTab === 'p2p' && (
              <PeerSimulator
                addToast={addToast}
              />
            )}

            {activeTab === 'ethernet' && (
              <EthernetSimulator
                addToast={addToast}
              />
            )}

            {activeTab === 'info' && (
              <InfoPanel />
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Global Toast Notification System */}
      <div className="toast-container" id="global-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`} id={`toast-${toast.id}`}>
            {toast.type === 'success' && <span style={{ display: 'flex' }}>✅</span>}
            {toast.type === 'error' && <span style={{ display: 'flex' }}>❌</span>}
            {toast.type === 'info' && <span style={{ display: 'flex' }}>ℹ️</span>}
            <span style={{ fontSize: '0.9rem', fontWeight: 500, flex: 1 }}>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
              title="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Developer Profile Modal */}
      {contactOpen && (
        <div className="modal-overlay" onClick={() => setContactOpen(false)} id="contact-modal-overlay">
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} id="contact-modal-content">
            <button
              type="button"
              className="modal-close"
              onClick={() => setContactOpen(false)}
              aria-label="Close modal"
              id="btn-close-contact-modal"
            >
              &times;
            </button>
            <div className="profile-card">
              <div className="profile-avatar">RD</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Rajatava Das</h3>
              <p className="profile-title">Full-Stack Software Developer</p>
              <hr className="profile-divider" />
              <p className="profile-about">
                An inspiring developer dedicated to creating privacy-first secure applications, crafting elegant user experiences, and bridging the gap between sophisticated backends and clean responsive frontends.
              </p>
              <div className="profile-links">
                <a href="mailto:rajatava2006@gmail.com" className="profile-link-btn" id="contact-email-link">📧 Email</a>
                <a href="https://github.com/rajatava06" target="_blank" rel="noopener noreferrer" className="profile-link-btn" id="contact-github-link">💻 GitHub</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
