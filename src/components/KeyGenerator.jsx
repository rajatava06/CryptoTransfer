import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, RefreshCw } from 'lucide-react';
import { generateSecureKey } from '../utils/crypto';

export default function KeyGenerator({ onUseKey, addToast }) {
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    handleGenerate();
  }, []);

  const handleGenerate = () => {
    const key = generateSecureKey();
    setGeneratedKey(key);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      if (addToast) {
        addToast('Security key copied to clipboard!', 'success');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (addToast) {
        addToast('Failed to copy key.', 'error');
      }
    }
  };

  const handleUseKey = () => {
    if (onUseKey) {
      onUseKey(generatedKey);
      if (addToast) {
        addToast('Security key applied to your encrypt panel!', 'info');
      }
    }
  };

  return (
    <div className="key-gen-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Key size={18} className="info-card-icon" />
        <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Security Key Generator</h4>
      </div>
      
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Generate a cryptographically random, high-entropy 256-bit passphrase. Use this key to encrypt your files for maximum security.
      </p>

      <div className="key-display" id="key-display-box">
        <span>{generatedKey}</span>
        <div className="key-display-actions">
          <button 
            type="button" 
            onClick={handleCopy} 
            className="key-action-btn"
            title="Copy Key"
            id="btn-copy-key"
          >
            {copied ? <Check size={18} style={{ color: 'var(--color-success)' }} /> : <Copy size={18} />}
          </button>
          <button 
            type="button" 
            onClick={handleGenerate} 
            className="key-action-btn"
            title="Regenerate Key"
            id="btn-regen-key"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button 
          type="button" 
          onClick={handleUseKey} 
          className="btn btn-secondary" 
          style={{ padding: '0.65rem 1rem', fontSize: '0.9rem' }}
          id="btn-use-key"
        >
          Use this Key for Encryption
        </button>
      </div>
    </div>
  );
}
