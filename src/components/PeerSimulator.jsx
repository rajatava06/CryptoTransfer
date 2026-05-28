import React, { useState, useEffect, useRef } from 'react';
import { Laptop, ArrowRight, Share2, Upload, File, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function PeerSimulator({ addToast }) {
  const [connectionCode, setConnectionCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [connectionState, setConnectionState] = useState('idle'); // idle, connecting, connected, transferring, finished
  const [targetCode, setTargetCode] = useState('');
  const [file, setFile] = useState(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [chunks, setChunks] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    // Generate a mock connection code for the user's tab
    const rand = Math.floor(1000 + Math.random() * 9000);
    setMyCode(`CRYPTO-P2P-${rand}`);
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
      const numBlocks = 40;
      const initialChunks = Array(numBlocks).fill('pending');
      setChunks(initialChunks);
    }
  };

  const handleConnect = (e) => {
    e.preventDefault();
    if (!targetCode) return;

    setConnectionState('connecting');
    addToast('Initiating secure WebRTC signaling handshake...', 'info');

    setTimeout(() => {
      setConnectionState('connected');
      addToast('Direct Peer-to-Peer encrypted tunnel established!', 'success');
    }, 1800);
  };

  const handleDisconnect = () => {
    setConnectionState('idle');
    setFile(null);
    setTransferProgress(0);
    setChunks([]);
    addToast('P2P connection closed.', 'info');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // Initialize blocks representation
      const numBlocks = 40;
      const initialChunks = Array(numBlocks).fill('pending');
      setChunks(initialChunks);
    }
  };

  const startP2PTransfer = () => {
    if (!file) return;

    setConnectionState('transferring');
    setTransferProgress(0);

    const numBlocks = chunks.length;
    let currentProgress = 0;

    // Simulate real-time speeds and block transmissions
    const interval = setInterval(() => {
      currentProgress += 2.5;

      setChunks((prev) => {
        const next = [...prev];
        const indexToUpdate = Math.floor((currentProgress / 100) * numBlocks);
        for (let i = 0; i < indexToUpdate; i++) {
          next[i] = 'sent';
        }
        return next;
      });

      setTransferProgress(currentProgress);

      // Random speed fluctuations
      setSpeed((30 + Math.random() * 15).toFixed(1));

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setConnectionState('finished');
          addToast('P2P transfer completed successfully!', 'success');
        }, 400);
      }
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
    <div className="view-card glass-panel" id="peer-simulator-card">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Direct Peer-to-Peer Transfer</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Simulate direct browser-to-browser encrypted transfers using WebRTC.
        </p>
      </div>

      {connectionState === 'idle' && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div className="key-gen-card" style={{ marginBottom: '2rem' }}>
            <span className="form-label" style={{ fontSize: '0.85rem' }}>Your Local Peer Address</span>
            <div className="key-display" id="my-peer-code-box">
              <span>{myCode}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', background: 'var(--color-success-glow)', padding: '0.15rem 0.5rem', borderRadius: '100px' }}>
                Active Listening
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Provide this address code to another browser tab or peer node to begin direct connections.
            </p>
          </div>

          <form onSubmit={handleConnect} id="p2p-connect-form">
            <div className="form-group">
              <label className="form-label" htmlFor="target-peer-code">
                <span>Connect to Peer Address</span>
              </label>
              <div className="form-input-container">
                <input
                  type="text"
                  id="target-peer-code"
                  className="form-input"
                  placeholder="Paste receiver peer address code"
                  value={targetCode}
                  onChange={(e) => setTargetCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!targetCode}
              id="btn-p2p-connect"
            >
              <Share2 size={18} />
              Establish Secure P2P Connection
            </button>
          </form>
        </div>
      )}

      {connectionState === 'connecting' && (
        <div className="process-container" id="p2p-connecting-container">
          <div className="processing-animation">
            <div className="glow-ring"></div>
            <Activity size={28} className="inner-icon" />
          </div>
          <h3>Performing Signaling Handshake</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Exchanging SDP offers & ICE candidates via STUN servers to bypass NAT...
          </p>
        </div>
      )}

      {(connectionState === 'connected' || connectionState === 'transferring' || connectionState === 'finished') && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          {/* Peer Nodes Mockup Grid */}
          <div className="p2p-workspace">
            <div className="p2p-node">
              <div className="node-icon-wrapper active">
                <Laptop size={24} />
              </div>
              <div className="node-title">Local Sender (You)</div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {myCode.substring(11)}
              </span>
            </div>

            <div className="p2p-transfer-bridge">
              {connectionState === 'transferring' ? (
                <>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Zap size={14} className="inner-icon" />
                    <span>{speed} MB/s</span>
                  </div>
                  <div className="bridge-line"></div>
                </>
              ) : (
                <div style={{ height: '2px', width: '100px', backgroundColor: 'var(--border-dim)' }}></div>
              )}
            </div>

            <div className="p2p-node">
              <div className="node-icon-wrapper active" style={{ color: 'var(--purple-primary)', background: 'var(--purple-glow)', boxShadow: '0 0 15px var(--purple-glow)' }}>
                <Laptop size={24} />
              </div>
              <div className="node-title">Remote Receiver</div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {targetCode.substring(11)}
              </span>
            </div>
          </div>

          <hr style={{ border: '0', height: '1px', background: 'var(--border-dim)', margin: '2rem 0' }} />

          {/* Staging & Uploading inside Connection */}
          {connectionState === 'connected' && (
            <div id="p2p-file-selection">
              {!file ? (
                <div
                  className={`dropzone ${isDragActive ? 'active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                  style={{ padding: '2rem' }}
                  id="p2p-dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    id="p2p-file-input"
                  />
                  <div className="dropzone-icon-container" style={{ width: '3rem', height: '3rem' }}>
                    <Upload size={20} />
                  </div>
                  <div className="dropzone-text">
                    <span className="dropzone-title" style={{ fontSize: '1rem' }}>Select file to send directly</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="selected-file-card" style={{ marginBottom: '1.5rem' }} id="p2p-selected-file">
                    <div className="file-info-layout">
                      <div className="file-icon">
                        <File size={28} />
                      </div>
                      <div className="file-meta">
                        <span className="file-name" style={{ maxWidth: '220px' }}>{file.name}</span>
                        <span className="file-size">{formattedSize(file.size)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => setFile(null)}
                      id="btn-remove-p2p-file"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={startP2PTransfer}
                    className="btn btn-primary"
                    id="btn-p2p-send"
                  >
                    Start Direct Secure Transfer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Transfer progress panel */}
          {connectionState === 'transferring' && (
            <div id="p2p-transferring-panel">
              <h4 style={{ textAlign: 'center', marginBottom: '1rem' }}>Streaming Encrypted Blocks</h4>

              {/* Chunk packets display grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: '6px',
                  marginBottom: '1.5rem',
                  maxWidth: '320px',
                  margin: '0 auto 1.5rem'
                }}
                id="p2p-chunk-grid"
              >
                {chunks.map((state, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '3px',
                      background: state === 'sent' ? 'var(--cyan-primary)' : 'rgba(255, 255, 255, 0.05)',
                      boxShadow: state === 'sent' ? '0 0 4px var(--cyan-primary)' : 'none',
                      transition: 'background 0.2s ease, box-shadow 0.2s ease'
                    }}
                  ></div>
                ))}
              </div>

              <div className="progress-header">
                <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Math.round(transferProgress)}%</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${transferProgress}%` }}></div>
              </div>
            </div>
          )}

          {/* Transfer Finished view */}
          {connectionState === 'finished' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }} id="p2p-finished-panel">
              <div className="success-card" style={{ background: 'hsla(142, 72%, 49%, 0.1)', borderColor: 'var(--color-success)', marginBottom: '1.5rem' }}>
                <div className="success-header" style={{ color: 'var(--color-success)', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                  <span>Transfer Completed</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                  The file <strong>{file.name}</strong> was directly transferred via WebRTC data channel. The connection bypassed cloud intermediaries entirely.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setConnectionState('connected');
                    setFile(null);
                    setTransferProgress(0);
                  }}
                  id="btn-p2p-send-another"
                >
                  Send Another File
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDisconnect}
                  id="btn-p2p-disconnect"
                >
                  Disconnect Tunnel
                </button>
              </div>
            </div>
          )}

          {connectionState !== 'transferring' && connectionState !== 'finished' && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '1.5rem', opacity: 0.6 }}
              onClick={handleDisconnect}
              id="btn-p2p-cancel"
            >
              Cancel Connection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
