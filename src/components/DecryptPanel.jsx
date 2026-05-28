import React, { useState, useRef, useEffect } from 'react';
import { Upload, File, X, Unlock, Eye, EyeOff, ShieldCheck, Download, AlertTriangle, ArrowRight } from 'lucide-react';
import { decryptFile } from '../utils/crypto';

export default function DecryptPanel({ addToast }) {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [decryptedFile, setDecryptedFile] = useState(null);
  
  const fileInputRef = useRef(null);

  // Auto-detect key from URL hash fragment if present
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('key=')) {
        const parts = hash.split('key=');
        if (parts[1]) {
          const decodedKey = decodeURIComponent(parts[1]);
          setPassword(decodedKey);
          addToast('Security key pre-filled from secure share link!', 'info');
        }
      }
    };

    handleHashChange(); // Run once on load
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setDecryptedFile(null);

      // Warning if not .crypto file (user can proceed anyway)
      if (!droppedFile.name.endsWith('.crypto')) {
        addToast('Warning: Uploaded file does not have .crypto extension', 'info');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setDecryptedFile(null);
      
      if (!selectedFile.name.endsWith('.crypto')) {
        addToast('Warning: Uploaded file does not have .crypto extension', 'info');
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setDecryptedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDecrypt = async (e) => {
    e.preventDefault();
    if (!file || !password) return;

    setIsProcessing(true);
    setProgress(20);
    setDecryptedFile(null);

    try {
      // Read file buffer
      const buffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });

      setProgress(50);

      // Decrypt
      const decrypted = await decryptFile(buffer, password);
      
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setDecryptedFile(decrypted);
        addToast('File decrypted successfully!', 'success');
      }, 400);
    } catch (err) {
      setIsProcessing(false);
      addToast(err.message || 'Decryption failed. Check key.', 'error');
    }
  };

  const downloadDecryptedFile = () => {
    if (!decryptedFile) return;
    const url = URL.createObjectURL(decryptedFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = decryptedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Decrypted file downloaded!', 'success');
  };

  const formattedSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="view-card glass-panel" id="decrypt-panel-card">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Local Decryption</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Restore and extract your encrypted `.crypto` files locally.
        </p>
      </div>

      {!isProcessing && !decryptedFile && (
        <form onSubmit={handleDecrypt} id="decrypt-form">
          {/* File Upload Zone */}
          {!file ? (
            <div
              className={`dropzone ${isDragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              id="file-dropzone-decrypt"
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                id="decrypt-file-input"
              />
              <div className="dropzone-icon-container">
                <Unlock size={28} />
              </div>
              <div className="dropzone-text">
                <span className="dropzone-title">Drag & drop your encrypted file</span>
                <span className="dropzone-desc">accepts `.crypto` file packages</span>
              </div>
            </div>
          ) : (
            <div className="selected-file-card" id="selected-file-decrypt">
              <div className="file-info-layout">
                <div className="file-icon" style={{ color: 'var(--purple-primary)' }}>
                  <File size={28} />
                </div>
                <div className="file-meta">
                  <span className="file-name" title={file.name}>{file.name}</span>
                  <span className="file-size">{formattedSize(file.size)}</span>
                </div>
              </div>
              <button
                type="button"
                className="remove-file-btn"
                onClick={handleRemoveFile}
                title="Remove file"
                id="btn-remove-decrypt-file"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Password Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="decrypt-password">
              <span>Security Key / Decryption Password</span>
            </label>
            <div className="form-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="decrypt-password"
                className="form-input"
                placeholder="Enter password or paste CRYP key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="form-input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide key' : 'Show key'}
                id="btn-toggle-decrypt-pass"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!file || !password}
            style={{ background: 'linear-gradient(90deg, var(--purple-primary), var(--cyan-primary))', boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)' }}
            id="btn-decrypt-submit"
          >
            <Unlock size={18} />
            Decrypt & Verify Package
          </button>
        </form>
      )}

      {/* Cryptographic Processing state */}
      {isProcessing && (
        <div className="process-container" id="decryption-progress-container">
          <div className="processing-animation">
            <div className="glow-ring" style={{ borderTopColor: 'var(--purple-primary)', borderBottomColor: 'var(--cyan-primary)', boxShadow: '0 0 15px var(--purple-glow)' }}></div>
            <Unlock size={28} className="inner-icon" style={{ color: 'var(--purple-primary)' }} />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Decrypting Staged Payload</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Unpacking package headers, deriving keys, and executing AES-GCM verification...
          </p>
          <div className="progress-header">
            <span style={{ color: 'var(--text-muted)' }}>Progress</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{progress}%</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--purple-primary), var(--cyan-primary))' }}></div>
          </div>
        </div>
      )}

      {/* Decryption Completed State */}
      {decryptedFile && (
        <div style={{ animation: 'fadeIn 0.3s' }} id="decryption-success-container">
          <div className="success-card" style={{ background: 'hsla(142, 72%, 49%, 0.1)', borderColor: 'var(--color-success)' }}>
            <div className="success-header" style={{ color: 'var(--color-success)' }}>
              <ShieldCheck size={20} />
              <span>Decryption Succeeded</span>
            </div>
            <div className="success-details">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Restored File:</span>
                <span style={{ fontWeight: 500 }}>{decryptedFile.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>File Size:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{formattedSize(decryptedFile.size)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>File MIME-type:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{decryptedFile.type || 'unknown'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={downloadDecryptedFile}
              style={{ background: 'var(--color-success)', color: 'var(--bg-darker)', boxShadow: '0 4px 20px var(--color-success-glow)' }}
              id="btn-download-decrypted"
            >
              <Download size={18} />
              Download Decrypted File
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '1rem', opacity: 0.8 }}
              onClick={handleRemoveFile}
              id="btn-decrypt-another"
            >
              Decrypt Another File
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
