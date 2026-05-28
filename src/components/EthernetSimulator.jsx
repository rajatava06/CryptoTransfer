import React, { useState, useRef, useEffect } from 'react';
import { Network, Cable, Upload, File, ShieldCheck, Play, Power, Compass } from 'lucide-react';

export default function EthernetSimulator({ addToast }) {
  const [cableConnected, setCableConnected] = useState(false);
  const [speedLimit, setSpeedLimit] = useState('1g'); // 100m, 1g, 10g
  const [file, setFile] = useState(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, idle, transferring, finished
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const handleCableToggle = () => {
    if (cableConnected) {
      setCableConnected(false);
      setConnectionState('disconnected');
      setFile(null);
      setTransferProgress(0);
      addToast('Ethernet cable unplugged.', 'info');
    } else {
      setCableConnected(true);
      setConnectionState('idle');
      addToast('Ethernet link active. Local IP allocated: 192.168.1.150', 'success');
    }
  };

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
      setTransferProgress(0);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setTransferProgress(0);
    }
  };

  const startEthernetTransfer = () => {
    if (!file) return;

    setConnectionState('transferring');
    setTransferProgress(0);

    // Calculate maximum transfer speeds based on selected Standard
    // 100 Mbps = ~11.8 MB/s
    // 1 Gbps = ~118 MB/s
    // 10 Gbps = ~980 MB/s
    let targetSpeedMB = 118;
    if (speedLimit === '100m') targetSpeedMB = 11.5;
    else if (speedLimit === '10g') targetSpeedMB = 960;

    const fileSizeMB = file.size / (1024 * 1024);
    let progressPercentage = 0;

    // Simulate transfer rate adjustments
    const interval = setInterval(() => {
      // Calculate randomized jitter/fluctuations (e.g. 5% variance)
      const speedJitter = targetSpeedMB * (0.95 + Math.random() * 0.08);
      setCurrentSpeed(speedJitter.toFixed(1));

      // Calculate how much we transfer in 100ms
      const transferredPerTickMB = speedJitter / 10;
      const progressDelta = (transferredPerTickMB / fileSizeMB) * 100;
      
      progressPercentage += Math.max(progressDelta, 2); // Ensure it advances at least 2% per tick

      if (progressPercentage >= 100) {
        progressPercentage = 100;
        clearInterval(interval);
        setTimeout(() => {
          setConnectionState('finished');
          addToast('LAN file transfer completed successfully!', 'success');
        }, 300);
      }

      setTransferProgress(Math.min(progressPercentage, 100));

      // Calculate remaining time
      const remainingMB = fileSizeMB * (1 - progressPercentage / 100);
      const remainingSec = remainingMB / speedJitter;
      setTimeRemaining(Math.max(Math.ceil(remainingSec), 0));
    }, 100);
  };

  const formattedSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="view-card glass-panel" id="ethernet-simulator-card">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Ethernet LAN Simulator</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Simulate ultra-high speed local file transfers over a wired Ethernet configuration.
        </p>
      </div>

      {/* Cable Connection Stage */}
      <div 
        className="key-gen-card" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1rem',
          padding: '2rem',
          borderStyle: cableConnected ? 'solid' : 'dashed',
          borderColor: cableConnected ? 'var(--color-success)' : 'var(--border-dim)'
        }}
        id="ethernet-cable-panel"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Network size={28} style={{ color: cableConnected ? 'var(--color-success)' : 'var(--text-muted)' }} />
          <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {cableConnected ? 'Local LAN Link Active' : 'Ethernet Link Disconnected'}
          </span>
        </div>
        
        <button
          type="button"
          onClick={handleCableToggle}
          className={`btn ${cableConnected ? 'btn-secondary' : 'btn-primary'}`}
          style={{ width: 'auto', padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          id="btn-toggle-cable"
        >
          <Power size={16} />
          {cableConnected ? 'Disconnect Cable' : 'Plug in Ethernet Cable'}
        </button>
      </div>

      {/* Connection active states */}
      {cableConnected && (
        <div style={{ animation: 'fadeIn 0.3s', marginTop: '1.5rem' }}>
          {connectionState === 'idle' && (
            <div id="ethernet-idle-form">
              {/* Speed Standard Selector */}
              <div className="form-group">
                <label className="form-label">
                  <span>Ethernet Link Standard</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`tab-btn ${speedLimit === '100m' ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setSpeedLimit('100m')}
                    id="btn-speed-100m"
                  >
                    100 Mbps (Fast)
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${speedLimit === '1g' ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setSpeedLimit('1g')}
                    id="btn-speed-1g"
                  >
                    1 Gbps (Gigabit)
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${speedLimit === '10g' ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setSpeedLimit('10g')}
                    id="btn-speed-10g"
                  >
                    10 Gbps (10-Gigabit)
                  </button>
                </div>
              </div>

              {/* File Dropzone */}
              {!file ? (
                <div
                  className={`dropzone ${isDragActive ? 'active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                  id="ethernet-dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    id="ethernet-file-input"
                  />
                  <div className="dropzone-icon-container">
                    <Cable size={24} />
                  </div>
                  <div className="dropzone-text">
                    <span className="dropzone-title">Select file to send over LAN</span>
                    <span className="dropzone-desc">simulates direct wired network transport</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="selected-file-card" id="ethernet-selected-file">
                    <div className="file-info-layout">
                      <div className="file-icon">
                        <File size={28} />
                      </div>
                      <div className="file-meta">
                        <span className="file-name" style={{ maxWidth: '280px' }}>{file.name}</span>
                        <span className="file-size">{formattedSize(file.size)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => setFile(null)}
                      id="btn-remove-ethernet-file"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={startEthernetTransfer}
                    className="btn btn-primary"
                    id="btn-ethernet-transmit"
                  >
                    <Play size={18} />
                    Transmit Over Local Ethernet
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Transferring State */}
          {connectionState === 'transferring' && (
            <div className="process-container" id="ethernet-transferring-panel">
              <div className="processing-animation">
                <Compass size={28} className="inner-icon" style={{ animation: 'spin-glow 2s linear infinite' }} />
              </div>
              
              <h3 style={{ marginBottom: '0.5rem' }}>Transmitting Data</h3>
              
              <div className="success-details" style={{ maxWidth: '320px', margin: '0 auto 1.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Transfer Rate:</span>
                  <span style={{ fontWeight: 600, color: 'var(--cyan-primary)' }}>{currentSpeed} MB/s</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Time:</span>
                  <span style={{ fontWeight: 600 }}>{timeRemaining}s remaining</span>
                </div>
              </div>

              <div className="progress-header">
                <span style={{ color: 'var(--text-muted)' }}>LAN Progress</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Math.round(transferProgress)}%</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${transferProgress}%`, background: 'linear-gradient(90deg, var(--cyan-primary), var(--purple-primary))' }}></div>
              </div>
            </div>
          )}

          {/* Transfer Finished State */}
          {connectionState === 'finished' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }} id="ethernet-finished-panel">
              <div className="success-card" style={{ background: 'hsla(142, 72%, 49%, 0.1)', borderColor: 'var(--color-success)', marginBottom: '1.5rem' }}>
                <div className="success-header" style={{ color: 'var(--color-success)', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                  <span>LAN Transfer Complete</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                  File <strong>{file.name}</strong> has been successfully transmitted to the target LAN node at a peak speed of <strong>{currentSpeed} MB/s</strong>.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setConnectionState('idle');
                    setFile(null);
                    setTransferProgress(0);
                  }}
                  id="btn-ethernet-send-another"
                >
                  Send Another File
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCableToggle}
                  id="btn-ethernet-disconnect"
                >
                  Disconnect Link
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
