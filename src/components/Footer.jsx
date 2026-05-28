import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="container footer-content">
        <p>© {new Date().getFullYear()} CryptoTransfer. Client-Side Cryptographic System.</p>
        <div className="footer-links">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            🔒 AES-GCM 256-bit
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            🔑 PBKDF2 Key Derivation
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            🛡️ Zero-Knowledge Architecture
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.6 }}>
          All encryption is completed inside your browser. No plaintext data is ever sent to our servers.
        </p>
      </div>
    </footer>
  );
}
