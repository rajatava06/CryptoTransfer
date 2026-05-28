import React, { useState, useRef, useEffect } from 'react';
import { Upload, File, X, Lock, Eye, EyeOff, ShieldCheck, Download, Link, ArrowRight, Server } from 'lucide-react';
import { encryptFile, evaluatePasswordStrength } from '../utils/crypto';
import KeyGenerator from './KeyGenerator';

export default function EncryptPanel({ passwordKey, setPasswordKey, addToast }) {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [encryptedData, setEncryptedData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef(null);

  // Sync password if KeyGenerator propagates one
  useEffect(() => {
    if (passwordKey) {
      setPassword(passwordKey);
    }
  }, [passwordKey]);

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
      setFile(e.dataTransfer.files[0]);
      setEncryptedData(null);
      setShareLink('');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setEncryptedData(null);
      setShareLink('');
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setEncryptedData(null);
    setShareLink('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEncrypt = async (e) => {
    e.preventDefault();
    if (!file || !password) return;

    setIsProcessing(true);
    setProgress(10);
    setEncryptedData(null);
    setShareLink('');

    try {
      // Simulate cryptographic progression for smooth UI visual transitions
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 80) {
            clearInterval(interval);
            return prev;
          }
          return prev + 15;
        });
      }, 100);

      // Perform local encryption
      const encryptedBuffer = await encryptFile(file, password);
      
      clearInterval(interval);
      setProgress(100);
      
      setTimeout(() => {
        setIsProcessing(false);
        setEncryptedData({
          buffer: encryptedBuffer,
          name: `${file.name}.crypto`,
          originalName: file.name,
          originalSize: file.size,
          encryptedSize: encryptedBuffer.byteLength
        });
        addToast('File encrypted successfully!', 'success');
      }, 400);
    } catch (err) {
      setIsProcessing(false);
      addToast(err.message || 'Encryption failed', 'error');
    }
  };

  const downloadEncryptedFile = () => {
    if (!encryptedData) return;
    const blob = new Blob([encryptedData.buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = encryptedData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Encrypted file downloaded!', 'success');
  };

  const simulateCloudShare = () => {
    setUploading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 150);

    setTimeout(() => {
      setUploading(false);
      // Generate a zero-knowledge URL. The key is in the hash fragment (#)
      // This is a secure sharing mechanism where the key is never sent to the server.
      const safePass = encodeURIComponent(password);
      const fileId = Math.random().toString(36).substring(2, 10);
      const url = `${window.location.origin}/download/${fileId}#key=${safePass}`;
      setShareLink(url);
      addToast('Secure sharing link generated!', 'success');
    }, 1200);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      addToast('Sharing link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      addToast('Failed to copy link.', 'error');
    }
  };

  const { score, label } = evaluatePasswordStrength(password);
  const formattedSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="view-card glass-panel" id="encrypt-panel-card">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Local Encryption</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Secure any file directly on your machine before sharing.
        </p>
      </div>

      {!isProcessing && !uploading && !encryptedData && (
        <form onSubmit={handleEncrypt} id="encrypt-form">
          {/* File Upload Zone */}
          {!file ? (
            <div
              className={`dropzone ${isDragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              id="file-dropzone-encrypt"
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                id="encrypt-file-input"
              />
              <div className="dropzone-icon-container">
                <Upload size={28} />
              </div>
              <div className="dropzone-text">
                <span className="dropzone-title">Drag & drop your file here</span>
                <span className="dropzone-desc">or click to browse from your device</span>
              </div>
            </div>
          ) : (
            <div className="selected-file-card" id="selected-file-encrypt">
              <div className="file-info-layout">
                <div className="file-icon">
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
                id="btn-remove-encrypt-file"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Password Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="encrypt-password">
              <span>Encryption Secret Key / Password</span>
              {password && (
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  color: label === 'Strong' ? 'var(--color-success)' : label === 'Medium' ? 'var(--color-warning)' : 'var(--color-error)'
                }}>
                  Strength: {label}
                </span>
              )}
            </label>
            <div className="form-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="encrypt-password"
                className="form-input"
                placeholder="Enter password or use generated key below"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordKey(e.target.value);
                }}
                required
              />
              <button
                type="button"
                className="form-input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                id="btn-toggle-encrypt-pass"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength indicators */}
            {password && (
              <div className="pass-strength-meter">
                <div className={`strength-bar ${score >= 1 ? (label === 'Strong' ? 'strong' : label === 'Medium' ? 'medium' : 'weak') : ''}`}></div>
                <div className={`strength-bar ${score >= 3 ? (label === 'Strong' ? 'strong' : label === 'Medium' ? 'medium' : 'weak') : ''}`}></div>
                <div className={`strength-bar ${score >= 4 ? 'strong' : ''}`}></div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!file || !password}
            id="btn-encrypt-submit"
          >
            <Lock size={18} />
            Encrypt File Locally
          </button>
        </form>
      )}

      {/* Cryptographic Processing state */}
      {isProcessing && (
        <div className="process-container" id="encryption-progress-container">
          <div className="processing-animation">
            <div className="glow-ring"></div>
            <Lock size={28} className="inner-icon" />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Encrypting File Staging</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Deriving keys & performing AES-GCM-256 transformations...
          </p>
          <div className="progress-header">
            <span style={{ color: 'var(--text-muted)' }}>Progress</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{progress}%</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {/* Cloud Upload Staging state */}
      {uploading && (
        <div className="process-container" id="upload-progress-container">
          <div className="processing-animation">
            <div className="glow-ring"></div>
            <Server size={28} className="inner-icon" style={{ color: 'var(--purple-primary)' }} />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Preparing Secure Node Link</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Staging encrypted package payload to zero-knowledge delivery block...
          </p>
          <div className="progress-header">
            <span style={{ color: 'var(--text-muted)' }}>Uploading</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{progress}%</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--purple-primary), var(--pink-accent))' }}></div>
          </div>
        </div>
      )}

      {/* Encryption Completed State */}
      {encryptedData && !uploading && (
        <div style={{ animation: 'fadeIn 0.3s' }} id="encryption-success-container">
          <div className="success-card">
            <div className="success-header">
              <ShieldCheck size={20} />
              <span>CryptoTransfer Cryptography Succeeded</span>
            </div>
            <div className="success-details">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Original File:</span>
                <span style={{ fontWeight: 500 }}>{encryptedData.originalName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Encrypted Package:</span>
                <span style={{ fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{encryptedData.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Size Overhead:</span>
                <span>{formattedSize(encryptedData.originalSize)} → {formattedSize(encryptedData.encryptedSize)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={downloadEncryptedFile}
              id="btn-download-encrypted"
            >
              <Download size={18} />
              Download Encrypted File (.crypto)
            </button>

            {!shareLink ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={simulateCloudShare}
                id="btn-simulate-share"
              >
                <Link size={18} />
                Generate Zero-Knowledge Sharing Link
              </button>
            ) : (
              <div className="share-link-group" id="share-link-result">
                <span className="form-label" style={{ fontSize: '0.85rem' }}>
                  Secure Zero-Knowledge Sharing Link
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  ⚠️ The encryption key is included in the URL hash fragment (#). It remains local to the browser and is never transmitted to the host server.
                </p>
                <div className="share-box">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="share-input"
                    id="share-link-input"
                  />
                  <button
                    type="button"
                    className="share-copy-btn"
                    onClick={copyShareLink}
                    id="btn-copy-share-link"
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '1rem', opacity: 0.8 }}
              onClick={handleRemoveFile}
              id="btn-encrypt-another"
            >
              Encrypt Another File
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Embed KeyGenerator utility inside form view */}
      {!isProcessing && !uploading && !encryptedData && (
        <div style={{ marginTop: '2.5rem' }}>
          <KeyGenerator 
            onUseKey={(key) => {
              setPassword(key);
              setPasswordKey(key);
            }} 
            addToast={addToast} 
          />
        </div>
      )}
    </div>
  );
}
