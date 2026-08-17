import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EncryptPanel from './components/EncryptPanel';
import DecryptPanel from './components/DecryptPanel';
import PeerSimulator from './components/PeerSimulator';
import InfoPanel from './components/InfoPanel';
import EthernetSimulator from './components/EthernetSimulator';
import { Lock, Unlock, Share2, X, Network, User, Mail } from 'lucide-react';
import './App.css';

const TAB_ORDER = ['encrypt', 'decrypt', 'p2p', 'ethernet'];

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
  const [glider, setGlider] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  // iOS-style hold & place gesture state for navigation bar
  const [holdingTab, setHoldingTab] = useState(null);
  const [isNavHolding, setIsNavHolding] = useState(false);

  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const holdingTabRef = useRef(holdingTab);
  useEffect(() => { holdingTabRef.current = holdingTab; }, [holdingTab]);

  const targetGliderTab = isNavHolding && holdingTab ? holdingTab : activeTab;

  const updateGlider = (targetTab = targetGliderTab) => {
    const navEl = navRef.current;
    const activeEl = tabRefs.current[targetTab];
    if (!navEl || !activeEl) {
      setGlider(prev => ({ ...prev, opacity: 0 }));
      return;
    }

    const navRect = navEl.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    setGlider({
      left: elRect.left - navRect.left + navEl.scrollLeft,
      top: elRect.top - navRect.top + navEl.scrollTop,
      width: elRect.width,
      height: elRect.height,
      opacity: 1,
    });
  };

  useLayoutEffect(() => {
    const navEl = navRef.current;
    const activeEl = tabRefs.current[targetGliderTab];
    if (!navEl || !activeEl) {
      setGlider(prev => ({ ...prev, opacity: 0 }));
      return;
    }

    // Scroll target tab smoothly to center of navigation bar
    const navWidth = navEl.clientWidth;
    const elLeft = activeEl.offsetLeft;
    const elWidth = activeEl.clientWidth;
    const targetScrollLeft = elLeft - navWidth / 2 + elWidth / 2;

    navEl.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth',
    });

    updateGlider(targetGliderTab);
  }, [activeTab, holdingTab, isNavHolding]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const handleScroll = () => {
      updateGlider(targetGliderTab);
    };

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        navEl.scrollLeft += e.deltaY;
      }
    };

    navEl.addEventListener('scroll', handleScroll, { passive: true });
    navEl.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('resize', () => updateGlider(targetGliderTab));

    return () => {
      navEl.removeEventListener('scroll', handleScroll);
      navEl.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', () => updateGlider(targetGliderTab));
    };
  }, [activeTab, holdingTab, isNavHolding]);

  // Helper: map touch clientX to closest tab item on nav-tabs bar
  const getTabFromClientX = (clientX) => {
    let closestTab = TAB_ORDER[0];
    let minDistance = Infinity;

    for (const tabKey of TAB_ORDER) {
      const el = tabRefs.current[tabKey];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        return tabKey;
      }
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(clientX - center);
      if (dist < minDistance) {
        minDistance = dist;
        closestTab = tabKey;
      }
    }
    return closestTab;
  };

  // Ultra-fluid iOS-style Hold & Place tab bar gesture effect
  useEffect(() => {
    const navTabsEl = navRef.current;
    if (!navTabsEl) return;

    let isTouchDraggingBar = false;
    let isMouseDown = false;

    const onNavTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      isTouchDraggingBar = true;
      const clientX = e.touches[0].clientX;
      const initialTab = getTabFromClientX(clientX);
      setIsNavHolding(true);
      setHoldingTab(initialTab);
      if ('vibrate' in navigator) navigator.vibrate(12);
    };

    const onNavTouchMove = (e) => {
      if (!isTouchDraggingBar || e.touches.length !== 1) return;
      if (e.cancelable) e.preventDefault();
      const clientX = e.touches[0].clientX;
      const currentTab = getTabFromClientX(clientX);
      if (currentTab !== holdingTabRef.current) {
        setHoldingTab(currentTab);
        if ('vibrate' in navigator) navigator.vibrate(8);
      }
    };

    const onNavTouchEnd = () => {
      if (!isTouchDraggingBar) return;
      isTouchDraggingBar = false;
      const finalTab = holdingTabRef.current;
      if (finalTab) {
        setActiveTab(finalTab);
      }
      setIsNavHolding(false);
      setHoldingTab(null);
    };

    // Mouse support for desktop hold & drag testing
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isMouseDown = true;
      const initialTab = getTabFromClientX(e.clientX);
      setIsNavHolding(true);
      setHoldingTab(initialTab);
    };

    const onMouseMove = (e) => {
      if (!isMouseDown) return;
      const currentTab = getTabFromClientX(e.clientX);
      if (currentTab !== holdingTabRef.current) {
        setHoldingTab(currentTab);
      }
    };

    const onMouseUp = () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      const finalTab = holdingTabRef.current;
      if (finalTab) {
        setActiveTab(finalTab);
      }
      setIsNavHolding(false);
      setHoldingTab(null);
    };

    navTabsEl.addEventListener('touchstart', onNavTouchStart, { passive: true });
    navTabsEl.addEventListener('touchmove', onNavTouchMove, { passive: false });
    navTabsEl.addEventListener('touchend', onNavTouchEnd, { passive: true });
    navTabsEl.addEventListener('touchcancel', onNavTouchEnd, { passive: true });

    navTabsEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      navTabsEl.removeEventListener('touchstart', onNavTouchStart);
      navTabsEl.removeEventListener('touchmove', onNavTouchMove);
      navTabsEl.removeEventListener('touchend', onNavTouchEnd);
      navTabsEl.removeEventListener('touchcancel', onNavTouchEnd);

      navTabsEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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
          {/* Navigation Tabs — iOS Hold & Place interactive slider */}
          <nav
            className={`nav-tabs ${isNavHolding ? 'holding' : ''}`}
            aria-label="Main Navigation"
            ref={navRef}
          >
            {/* Glider pill */}
            <span
              className={`nav-glider ${isNavHolding ? 'holding' : ''}`}
              aria-hidden="true"
              style={{
                opacity: glider.opacity,
                width: glider.width,
                height: glider.height,
                transform: `translate(${glider.left}px, ${glider.top}px)`,
                transition: isNavHolding
                  ? 'transform 0.16s cubic-bezier(0.18, 0.89, 0.32, 1.25), width 0.16s cubic-bezier(0.18, 0.89, 0.32, 1.25)'
                  : 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            />

            <button
              id="tab-encrypt-btn"
              type="button"
              ref={el => tabRefs.current['encrypt'] = el}
              className={`tab-btn ${targetGliderTab === 'encrypt' ? 'active' : ''} ${isNavHolding && holdingTab === 'encrypt' ? 'holding-target' : ''}`}
              onClick={() => setActiveTab('encrypt')}
            >
              <Lock size={18} />
              Encrypt
            </button>
            <button
              id="tab-decrypt-btn"
              type="button"
              ref={el => tabRefs.current['decrypt'] = el}
              className={`tab-btn ${targetGliderTab === 'decrypt' ? 'active' : ''} ${isNavHolding && holdingTab === 'decrypt' ? 'holding-target' : ''}`}
              onClick={() => setActiveTab('decrypt')}
            >
              <Unlock size={18} />
              Decrypt
            </button>
            <button
              id="tab-p2p-btn"
              type="button"
              ref={el => tabRefs.current['p2p'] = el}
              className={`tab-btn ${targetGliderTab === 'p2p' ? 'active' : ''} ${isNavHolding && holdingTab === 'p2p' ? 'holding-target' : ''}`}
              onClick={() => setActiveTab('p2p')}
            >
              <Share2 size={18} />
              P2P
            </button>
            <button
              id="tab-ethernet-btn"
              type="button"
              ref={el => tabRefs.current['ethernet'] = el}
              className={`tab-btn ${targetGliderTab === 'ethernet' ? 'active' : ''} ${isNavHolding && holdingTab === 'ethernet' ? 'holding-target' : ''}`}
              onClick={() => setActiveTab('ethernet')}
            >
              <Network size={18} />
              Ethernet
            </button>
          </nav>

          {/* Active Tab Panel Container */}
          <div
            id="swipe-zone"
            className="active-view-container"
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
                <a
                  href="mailto:rajatava2006@gmail.com"
                  onClick={(e) => {
                    e.preventDefault();
                    const email = 'rajatava2006@gmail.com';
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(email).then(() => {
                        addToast('Email copied to clipboard! (rajatava2006@gmail.com)', 'success');
                      }).catch(() => {
                        addToast('Email: rajatava2006@gmail.com', 'info');
                      });
                    } else {
                      addToast('Email: rajatava2006@gmail.com', 'info');
                    }
                    const gmailWin = window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank');
                    if (!gmailWin) {
                      window.location.href = `mailto:${email}`;
                    }
                  }}
                  className="profile-link-btn"
                  id="contact-email-link"
                >
                  <Mail size={16} />
                  <span>Email</span>
                </a>
                <a
                  href="https://github.com/rajatava06"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-link-btn"
                  id="contact-github-link"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
