import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EncryptPanel from './components/EncryptPanel';
import DecryptPanel from './components/DecryptPanel';
import PeerSimulator from './components/PeerSimulator';
import InfoPanel from './components/InfoPanel';
import EthernetSimulator from './components/EthernetSimulator';
import { Lock, Unlock, Share2, X, Network, User, Github, Mail } from 'lucide-react';
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

  const updateGlider = () => {
    const navEl = navRef.current;
    const activeEl = tabRefs.current[activeTab];
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
    const activeEl = tabRefs.current[activeTab];
    if (!navEl || !activeEl) {
      setGlider(prev => ({ ...prev, opacity: 0 }));
      return;
    }

    // Scroll active tab smoothly to center of navigation bar (WhatsApp iOS style)
    const navWidth = navEl.clientWidth;
    const elLeft = activeEl.offsetLeft;
    const elWidth = activeEl.clientWidth;
    const targetScrollLeft = elLeft - navWidth / 2 + elWidth / 2;

    navEl.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth',
    });

    updateGlider();
  }, [activeTab]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const handleScroll = () => {
      updateGlider();
    };

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        navEl.scrollLeft += e.deltaY;
      }
    };

    navEl.addEventListener('scroll', handleScroll, { passive: true });
    navEl.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('resize', updateGlider);

    return () => {
      navEl.removeEventListener('scroll', handleScroll);
      navEl.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', updateGlider);
    };
  }, [activeTab]);


  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);
  const swipeLocked = useRef(null); // 'h' | 'v' | null
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // Touch gesture handler for both nav-tabs bar and swipe-zone view container
  useEffect(() => {
    const swipeZoneEl = document.getElementById('swipe-zone');
    const navTabsEl = navRef.current;
    if (!swipeZoneEl) return;

    let touchStartTime = 0;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      swipeStartX.current = e.touches[0].clientX;
      swipeStartY.current = e.touches[0].clientY;
      touchStartTime = Date.now();
      swipeLocked.current = null;
      setIsSwiping(false);
    };

    const onTouchMove = (e) => {
      if (swipeStartX.current === null) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - swipeStartX.current;
      const dy = currentY - swipeStartY.current;

      if (!swipeLocked.current) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          swipeLocked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        }
      }

      if (swipeLocked.current === 'h') {
        if (e.cancelable) e.preventDefault();
        setIsSwiping(true);
        const currentIndex = TAB_ORDER.indexOf(activeTabRef.current);
        const isAtFirst = currentIndex === 0 && dx > 0;
        const isAtLast = currentIndex === TAB_ORDER.length - 1 && dx < 0;

        // Apply rubber-band damping if at edges
        const effectiveDx = (isAtFirst || isAtLast) ? dx * 0.25 : dx;
        setSwipeOffset(effectiveDx);
      }
    };

    const onTouchEnd = (e) => {
      if (swipeStartX.current === null) return;
      const touchEndTime = Date.now();
      const dt = touchEndTime - touchStartTime;

      if (swipeLocked.current === 'h') {
        const dx = e.changedTouches[0].clientX - swipeStartX.current;
        const velocity = Math.abs(dx) / (dt || 1);
        const currentIndex = TAB_ORDER.indexOf(activeTabRef.current);
        const threshold = window.innerWidth < 768 ? 35 : 60;

        if (Math.abs(dx) > threshold || velocity > 0.35) {
          if (dx < 0 && currentIndex !== -1 && currentIndex < TAB_ORDER.length - 1) {
            setActiveTab(TAB_ORDER[currentIndex + 1]);
          } else if (dx > 0 && currentIndex > 0) {
            setActiveTab(TAB_ORDER[currentIndex - 1]);
          }
        }
      }

      // Animate spring back to center offset
      setIsSwiping(false);
      setSwipeOffset(0);
      swipeStartX.current = null;
      swipeStartY.current = null;
      swipeLocked.current = null;
    };

    // Attach to view container
    swipeZoneEl.addEventListener('touchstart', onTouchStart, { passive: true });
    swipeZoneEl.addEventListener('touchmove', onTouchMove, { passive: false });
    swipeZoneEl.addEventListener('touchend', onTouchEnd, { passive: true });
    swipeZoneEl.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // Attach directly to nav-tabs bar if present
    if (navTabsEl) {
      navTabsEl.addEventListener('touchstart', onTouchStart, { passive: true });
      navTabsEl.addEventListener('touchmove', onTouchMove, { passive: false });
      navTabsEl.addEventListener('touchend', onTouchEnd, { passive: true });
      navTabsEl.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    return () => {
      swipeZoneEl.removeEventListener('touchstart', onTouchStart);
      swipeZoneEl.removeEventListener('touchmove', onTouchMove);
      swipeZoneEl.removeEventListener('touchend', onTouchEnd);
      swipeZoneEl.removeEventListener('touchcancel', onTouchEnd);
      if (navTabsEl) {
        navTabsEl.removeEventListener('touchstart', onTouchStart);
        navTabsEl.removeEventListener('touchmove', onTouchMove);
        navTabsEl.removeEventListener('touchend', onTouchEnd);
        navTabsEl.removeEventListener('touchcancel', onTouchEnd);
      }
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
            className={`nav-tabs ${isSwiping ? 'swiping' : ''}`}
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
                transform: `translate(${glider.left + swipeOffset * 0.15}px, ${glider.top}px)`,
                transition: isSwiping ? 'none' : 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            />

            <button
              id="tab-encrypt-btn"
              type="button"
              ref={el => tabRefs.current['encrypt'] = el}
              className={`tab-btn ${activeTab === 'encrypt' ? 'active' : ''}`}
              onClick={() => setActiveTab('encrypt')}
            >
              <Lock size={18} />
              Encrypt
            </button>
            <button
              id="tab-decrypt-btn"
              type="button"
              ref={el => tabRefs.current['decrypt'] = el}
              className={`tab-btn ${activeTab === 'decrypt' ? 'active' : ''}`}
              onClick={() => setActiveTab('decrypt')}
            >
              <Unlock size={18} />
              Decrypt
            </button>
            <button
              id="tab-p2p-btn"
              type="button"
              ref={el => tabRefs.current['p2p'] = el}
              className={`tab-btn ${activeTab === 'p2p' ? 'active' : ''}`}
              onClick={() => setActiveTab('p2p')}
            >
              <Share2 size={18} />
              P2P
            </button>
            <button
              id="tab-ethernet-btn"
              type="button"
              ref={el => tabRefs.current['ethernet'] = el}
              className={`tab-btn ${activeTab === 'ethernet' ? 'active' : ''}`}
              onClick={() => setActiveTab('ethernet')}
            >
              <Network size={18} />
              Ethernet
            </button>
          </nav>

          {/* Active Tab Panel — swipe zone with real-time iOS translation */}
          <div
            id="swipe-zone"
            className="active-view-container"
            style={{
              transform: `translateX(${swipeOffset}px)`,
              transition: isSwiping ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
              touchAction: 'pan-y pinch-zoom',
              willChange: 'transform'
            }}
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
                  <Github size={16} />
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
