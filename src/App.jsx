import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EncryptPanel from './components/EncryptPanel';
import DecryptPanel from './components/DecryptPanel';
import PeerSimulator from './components/PeerSimulator';
import InfoPanel from './components/InfoPanel';
import EthernetSimulator from './components/EthernetSimulator';
import { Lock, Unlock, Share2, HelpCircle, X, Network, User } from 'lucide-react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('encrypt'); // encrypt, decrypt, p2p, info
  const [passwordKey, setPasswordKey] = useState('');
  const [toasts, setToasts] = useState([]);
  const [contactOpen, setContactOpen] = useState(false);

  // Auto-switch to decrypt if link contains a key hash
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('key=')) {
      setActiveTab('decrypt');
    }
  }, []);

  const addToast = (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} setContactOpen={setContactOpen} />

      <main className="main-content">
        <div className="container">
          {/* Navigation Tabs */}
          <nav className="nav-tabs" aria-label="Main Navigation">
            <button
              id="tab-encrypt-btn"
              type="button"
              className={`tab-btn ${activeTab === 'encrypt' ? 'active' : ''}`}
              onClick={() => setActiveTab('encrypt')}
            >
              <Lock size={16} />
              Encrypt
            </button>
            <button
              id="tab-decrypt-btn"
              type="button"
              className={`tab-btn ${activeTab === 'decrypt' ? 'active' : ''}`}
              onClick={() => setActiveTab('decrypt')}
            >
              <Unlock size={16} />
              Decrypt
            </button>
            <button
              id="tab-p2p-btn"
              type="button"
              className={`tab-btn ${activeTab === 'p2p' ? 'active' : ''}`}
              onClick={() => setActiveTab('p2p')}
            >
              <Share2 size={16} />
              P2P Simulator
            </button>
            <button
              id="tab-ethernet-btn"
              type="button"
              className={`tab-btn ${activeTab === 'ethernet' ? 'active' : ''}`}
              onClick={() => setActiveTab('ethernet')}
            >
              <Network size={16} />
              Ethernet LAN
            </button>
          </nav>

          {/* Active Tab Panel */}
          <div className="active-view-container" style={{ animation: 'fadeIn 0.3s' }}>
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
