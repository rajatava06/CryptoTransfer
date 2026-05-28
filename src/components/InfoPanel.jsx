import React from 'react';
import { Shield, Key, FileCode, CheckCircle, ArrowRight } from 'lucide-react';

export default function InfoPanel() {
  return (
    <div className="view-card glass-panel" id="info-panel-card">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Security Architecture</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Understanding browser-based cryptography and zero-knowledge transfers.
        </p>
      </div>

      <div className="info-grid">
        <div className="info-card" id="info-card-pbkdf2">
          <div className="info-card-icon">
            <Key size={24} />
          </div>
          <h3 className="info-card-title">PBKDF2 Key Derivation</h3>
          <p className="info-card-text">
            Standard passphrases are vulnerable to dictionary attacks. PBKDF2 derive keys by applying HMAC-SHA256 100,000 times on the password combined with a unique random salt. This makes brute-force attacks computationally infeasible.
          </p>
        </div>

        <div className="info-card" id="info-card-aes">
          <div className="info-card-icon">
            <Shield size={24} />
          </div>
          <h3 className="info-card-title">AES-256-GCM Encryption</h3>
          <p className="info-card-text">
            Advanced Encryption Standard (AES) with Galois/Counter Mode (GCM) provides symmetric encryption and authenticated data integrity. Each file uses a fresh, random 96-bit Initialization Vector (IV) so that identical files encrypt differently.
          </p>
        </div>

        <div className="info-card" id="info-card-integrity">
          <div className="info-card-icon">
            <CheckCircle size={24} />
          </div>
          <h3 className="info-card-title">Tamper-Proof Verification</h3>
          <p className="info-card-text">
            GCM computes an authentication tag from the plaintext during encryption. During decryption, Web Crypto recalculates this tag. If a single bit of the encrypted file is altered in transit, decryption will fail, guaranteeing perfect integrity.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>Encryption Flow Chart</h3>
        
        <div className="flowchart-container" id="flowchart-visual">
          <div className="flow-step">
            <div className="flow-step-icon">
              <FileCode size={20} />
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Plaintext File</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Raw Binary Buffer</div>
          </div>

          <div className="flow-arrow">
            <ArrowRight size={16} />
          </div>

          <div className="flow-step">
            <div className="flow-step-icon" style={{ color: 'var(--purple-primary)', background: 'var(--purple-glow)' }}>
              <Key size={20} />
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>PBKDF2 SHA-256</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Password + 16B Salt</div>
          </div>

          <div className="flow-arrow">
            <ArrowRight size={16} />
          </div>

          <div className="flow-step">
            <div className="flow-step-icon" style={{ color: 'var(--cyan-primary)', background: 'var(--cyan-glow)' }}>
              <Shield size={20} />
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>AES-GCM (256-bit)</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>12-Byte Unique IV</div>
          </div>

          <div className="flow-arrow">
            <ArrowRight size={16} />
          </div>

          <div className="flow-step">
            <div className="flow-step-icon" style={{ color: 'var(--color-success)', background: 'var(--color-success-glow)' }}>
              <CheckCircle size={20} />
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Encrypted Package</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Output `.crypto` File</div>
          </div>
        </div>
      </div>
    </div>
  );
}
