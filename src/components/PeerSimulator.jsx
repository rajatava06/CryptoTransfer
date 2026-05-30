/**
 * PeerSimulator.jsx – Real WebRTC P2P File Transfer
 * ───────────────────────────────────────────────────
 * Uses RTCPeerConnection + RTCDataChannel for actual peer-to-peer
 * transfers.  A lightweight WebSocket signaling server
 * (server/signaling.cjs) handles only the handshake — no file data
 * ever passes through the server.
 *
 * Works:
 *  • Same tab / same browser  (dev / demo)
 *  • Different tabs / different browsers on the same machine
 *  • Different laptops on the same LAN  ← new!
 *  • Different networks (if you expose the signaling server)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Share2, Upload, File, ShieldCheck, Zap, Activity,
  X, Radio, CheckCircle2, ArrowRight, ArrowLeft,
  Download, Bell, Copy, ArrowDown, Wifi, WifiOff, AlertCircle,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];
const CHUNK_SIZE = 16384; // 16 KB — safe DataChannel chunk size
const SIGNAL_PORT = 9001;

/* ─── Helpers ───────────────────────────────────────────────── */
const genCode = () => `CRYPTO-P2P-${Math.floor(1000 + Math.random() * 9000)}`;
const fmtBytes = (b) => {
  if (!b || b === 0) return '0 B';
  const k = 1024, u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / k ** i).toFixed(2))} ${u[i]}`;
};
const getSignalURL = () => `ws://${window.location.hostname}:${SIGNAL_PORT}`;

/* ─── ChunkGrid ─────────────────────────────────────────────── */
function ChunkGrid({ pct, color }) {
  const done = Math.ceil((pct / 100) * 40);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 4, maxWidth: 280, margin: '0 auto 1rem' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{
          aspectRatio: '1', borderRadius: 3,
          background: i < done ? color : 'rgba(255,255,255,0.05)',
          boxShadow: i < done ? `0 0 4px ${color}` : 'none',
          transition: 'background 0.1s, box-shadow 0.1s',
        }} />
      ))}
    </div>
  );
}

/* ─── ProgressBlock ─────────────────────────────────────────── */
function ProgressBlock({ pct, bytes, total, speed, elapsed, color, label }) {
  return (
    <div>
      <p style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.8rem' }}>{label}</p>
      <ChunkGrid pct={pct} color={color} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{fmtBytes(bytes)} / {fmtBytes(total)}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Math.min(100, Math.round(pct))}%</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden', marginBottom: '0.4rem' }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, transition: 'width 0.15s linear' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
        <span>⏱ {elapsed}s</span><span>⚡ {speed} MB/s</span>
      </div>
    </div>
  );
}

/* ─── SignalStatus badge ────────────────────────────────────── */
function SignalStatus({ status }) {
  const map = {
    connecting: { color: 'var(--color-warning)', icon: <Activity size={11} />, text: 'Connecting to signal server…' },
    connected: { color: 'var(--color-success)', icon: <Wifi size={11} />, text: 'Signal server connected' },
    error: { color: 'var(--color-error)', icon: <WifiOff size={11} />, text: 'Signal server offline — start it first' },
  };
  const s = map[status] || map.connecting;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: s.color, marginBottom: '1rem', background: `${s.color}15`, border: `1px solid ${s.color}40`, borderRadius: 7, padding: '0.35rem 0.7rem' }}>
      {s.icon}<span>{s.text}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  useSignaling  —  manages the WebSocket + RTCPeerConnection
 *
 *  Returns an object with:
 *    sigStatus     'connecting' | 'connected' | 'error'
 *    myCode        generated peer code (registered on server)
 *    sendSignal    (msg) => void   — send any message via WS
 *    onSignal      ref to set a handler for incoming messages
 * ══════════════════════════════════════════════════════════════ */
function useSignaling() {
  const [sigStatus, setSigStatus] = useState('connecting');
  const [myCode] = useState(genCode);
  const wsRef = useRef(null);
  const handlerRef = useRef(null); // set by component to handle incoming msgs

  const connect = useCallback(() => {
    setSigStatus('connecting');
    const url = getSignalURL();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'register', code: myCode }));
    };

    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'registered') { setSigStatus('connected'); return; }
      if (handlerRef.current) handlerRef.current(msg);
    };

    ws.onclose = () => {
      setSigStatus('error');
      // Retry after 3s
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      setSigStatus('error');
      ws.close();
    };
  }, [myCode]); // eslint-disable-line

  useEffect(() => {
    connect();
    return () => {
      const ws = wsRef.current;
      if (ws) { ws.onclose = null; ws.close(); }
    };
  }, []); // eslint-disable-line

  const sendSignal = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return { sigStatus, myCode, sendSignal, onSignal: handlerRef };
}

/* ═══════════════════════════════════════════════════════════════
 *  SENDER COMPONENT
 * ══════════════════════════════════════════════════════════════ */
function SenderPanel({ sigStatus, myCode, sendSignal, onSignal, addToast }) {
  const [targetCode, setTarget] = useState('');
  const [phase, setPhase] = useState('idle'); // idle|requesting|connected|awaiting|sending|done
  const [file, setFile] = useState(null);
  const [pct, setPct] = useState(0);
  const [speed, setSpeed] = useState('0.0');
  const [elapsed, setElapsed] = useState('0.0');
  const [txBytes, setTxBytes] = useState(0);
  const [isDrag, setIsDrag] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const fileRef = useRef(null);
  const targetRef = useRef('');
  const t0Ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { fileRef.current = file; }, [file]);
  useEffect(() => { targetRef.current = targetCode; }, [targetCode]);

  /* Handle incoming signals addressed to us */
  useEffect(() => {
    onSignal.current = (msg) => {
      if (msg.type === 'error') {
        setErrMsg(msg.reason);
        setPhase('idle');
        addToast(msg.reason, 'error');
        return;
      }
      if (msg.type === 'accept' && msg.from === targetRef.current) {
        addToast('Receiver accepted! Establishing WebRTC…', 'success');
        startWebRTC(msg.from);
        return;
      }
      if (msg.type === 'reject' && msg.from === targetRef.current) {
        cleanup();
        setPhase('idle');
        addToast('Receiver rejected the request.', 'info');
        return;
      }
      if (msg.type === 'answer') {
        pcRef.current?.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        return;
      }
      if (msg.type === 'ice') {
        try { pcRef.current?.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch (_) { }
        return;
      }
    };
  }, []); // eslint-disable-line

  const cleanup = () => {
    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;
  };

  /* Send the file request */
  const sendRequest = () => {
    if (!file || !targetCode.trim()) return;
    setErrMsg('');
    sendSignal({ type: 'request', to: targetCode.trim(), fileName: file.name, fileSize: file.size });
    setPhase('awaiting');
    addToast(`Request sent to ${targetCode.trim()} — waiting for accept…`, 'info');
  };

  /* Build RTCPeerConnection and start the offer/answer flow */
  const startWebRTC = async (remoteCode) => {
    cleanup();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    /* Data channel for file */
    const dc = pc.createDataChannel('file', { ordered: true });
    dcRef.current = dc;

    dc.onopen = () => {
      setPhase('sending');
      addToast('WebRTC data channel open — sending…', 'success');
      sendFile(fileRef.current, dc);
    };
    dc.onerror = (e) => { addToast('DataChannel error: ' + e.message, 'error'); cleanup(); setPhase('idle'); };

    /* ICE */
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal({ type: 'ice', to: remoteCode, candidate: candidate.toJSON() });
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        addToast('WebRTC connection failed — check both devices are on the same network.', 'error');
        cleanup(); setPhase('idle');
      }
    };

    /* Create offer */
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ type: 'offer', to: remoteCode, sdp: pc.localDescription });
  };

  /* Stream the file through the DataChannel */
  const sendFile = async (f, dc) => {
    const buffer = await f.arrayBuffer();
    const total = buffer.byteLength;
    let offset = 0;
    t0Ref.current = Date.now();
    let lastBytes = 0, lastTime = Date.now();

    /* Send metadata first */
    dc.send(JSON.stringify({ type: 'meta', name: f.name, size: f.size, mime: f.type || 'application/octet-stream' }));

    const sendChunk = () => {
      /* Throttle: wait if buffer is filling up */
      if (dc.bufferedAmount > 5 * CHUNK_SIZE) {
        setTimeout(sendChunk, 50);
        return;
      }

      const slice = buffer.slice(offset, offset + CHUNK_SIZE);
      dc.send(slice);
      offset += slice.byteLength;

      const pct = (offset / total) * 100;
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      const spd = dt > 0.2 ? (((offset - lastBytes) / dt) / 1024 / 1024).toFixed(1) : speed;
      if (dt > 0.2) { lastBytes = offset; lastTime = now; }
      const el = ((now - t0Ref.current) / 1000).toFixed(1);

      setPct(pct);
      setSpeed(spd);
      setElapsed(el);
      setTxBytes(offset);

      if (offset < total) {
        setTimeout(sendChunk, 0);
      } else {
        /* Send end signal */
        dc.send(JSON.stringify({ type: 'done' }));
        setTimeout(() => {
          setPhase('done');
          addToast(`✓ "${f.name}" sent via WebRTC!`, 'success');
        }, 300);
      }
    };

    sendChunk();
  };

  const connect = (e) => {
    e.preventDefault();
    if (!targetCode.trim()) return;
    setErrMsg('');
    setPhase('connected');
    addToast('Ready to send. Pick a file.', 'success');
  };

  const disconnect = () => {
    cleanup();
    setPhase('idle');
    setFile(null);
    setTarget('');
    setPct(0); setTxBytes(0); setElapsed('0.0');
    addToast('Disconnected.', 'info');
  };

  /* drag */
  const onDrag = (e) => { e.preventDefault(); setIsDrag(e.type !== 'dragleave' && e.type !== 'drop'); };
  const onDrop = (e) => { e.preventDefault(); setIsDrag(false); pick(e.dataTransfer?.files?.[0]); };
  const onFile = (e) => { pick(e.target.files?.[0]); e.target.value = ''; };
  const pick = (f) => { if (f) { setFile(f); setPct(0); setTxBytes(0); setElapsed('0.0'); } };

  const copyCode = () => {
    navigator.clipboard.writeText(myCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    addToast('Sender code copied!', 'success');
  };

  /* ── render ── */
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.9rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowRight size={14} color="var(--cyan-primary)" />
        </div>
        <div><div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Sender</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Initiates transfer</div></div>
      </div>

      <SignalStatus status={sigStatus} />

      {errMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--color-error-glow)', border: '1px solid var(--color-error)', borderRadius: 8, padding: '0.5rem 0.8rem', marginBottom: '0.9rem', fontSize: '0.8rem', color: 'var(--color-error)' }}>
          <AlertCircle size={13} />{errMsg}
        </div>
      )}

      {/* my code */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: 9, padding: '0.65rem 0.85rem', marginBottom: '0.9rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Your Sender Code</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyan-primary)', wordBreak: 'break-all' }}>{myCode}</span>
          <button onClick={copyCode} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--color-success)' : 'var(--text-muted)', flexShrink: 0 }}><Copy size={12} /></button>
        </div>
      </div>

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <form onSubmit={connect}>
          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label className="form-label" htmlFor="sender-target" style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>
              Receiver's Code
            </label>
            <input id="sender-target" className="form-input" type="text"
              placeholder="CRYPTO-P2P-XXXX"
              value={targetCode} onChange={e => setTarget(e.target.value)}
              autoComplete="off" spellCheck={false} style={{ fontSize: '0.88rem' }}
              disabled={sigStatus !== 'connected'}
            />
          </div>
          <button className="btn btn-primary" type="submit"
            disabled={!targetCode.trim() || sigStatus !== 'connected'}
            style={{ justifyContent: 'center' }}>
            <Share2 size={14} /> Connect to Receiver
          </button>
        </form>
      )}

      {/* ── CONNECTED: pick file ── */}
      {phase === 'connected' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.85rem' }}>
            <Radio size={11} color="var(--color-success)" className="inner-icon" />
            <span style={{ fontSize: '0.76rem', color: 'var(--color-success)' }}>
              Ready → <strong style={{ fontFamily: 'var(--font-mono)' }}>{targetCode}</strong>
            </span>
          </div>

          {!file ? (
            <div
              className={`dropzone ${isDrag ? 'active' : ''}`}
              onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              style={{ padding: '1.4rem 1rem', cursor: 'pointer', marginBottom: '0.8rem' }}
            >
              <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={onFile} />
              <div className="dropzone-icon-container" style={{ width: '2.4rem', height: '2.4rem' }}><Upload size={15} /></div>
              <div className="dropzone-text"><span className="dropzone-title" style={{ fontSize: '0.84rem' }}>Drop or click to choose file</span></div>
            </div>
          ) : (
            <div>
              <div className="selected-file-card" style={{ marginBottom: '0.8rem' }}>
                <div className="file-info-layout">
                  <div className="file-icon"><File size={20} /></div>
                  <div className="file-meta">
                    <span className="file-name" style={{ maxWidth: 140, fontSize: '0.82rem' }}>{file.name}</span>
                    <span className="file-size">{fmtBytes(file.size)}</span>
                  </div>
                </div>
                <button className="remove-file-btn" onClick={() => setFile(null)}><X size={14} /></button>
              </div>
              <button className="btn btn-primary" onClick={sendRequest} style={{ justifyContent: 'center' }}>
                <Zap size={14} /> Send to Receiver
              </button>
            </div>
          )}
          <button className="btn btn-secondary" onClick={disconnect} style={{ marginTop: '0.7rem', justifyContent: 'center', opacity: 0.6, fontSize: '0.82rem' }}>
            Cancel
          </button>
        </div>
      )}

      {/* ── AWAITING ACCEPT ── */}
      {phase === 'awaiting' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div className="processing-animation" style={{ margin: '0 auto 0.65rem', width: 50, height: 50 }}>
            <div className="glow-ring" /><Activity size={18} className="inner-icon" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Waiting for receiver to accept…</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.3rem' }}>"{file?.name}"</p>
          <button className="btn btn-secondary" onClick={disconnect} style={{ marginTop: '0.9rem', fontSize: '0.8rem', justifyContent: 'center', opacity: 0.65 }}>Cancel</button>
        </div>
      )}

      {/* ── SENDING ── */}
      {phase === 'sending' && (
        <ProgressBlock pct={pct} bytes={txBytes} total={file?.size}
          speed={speed} elapsed={elapsed}
          color="var(--cyan-primary)" label="Sending via WebRTC DataChannel" />
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: '0.4rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--color-success)', marginBottom: '0.45rem' }}>
            <CheckCircle2 size={18} /><strong>Sent!</strong>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.9rem' }}>
            {file?.name} · {fmtBytes(file?.size)} · {elapsed}s
          </p>
          <div style={{ display: 'flex', gap: '0.55rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ fontSize: '0.82rem', justifyContent: 'center' }}
              onClick={() => { cleanup(); setPhase('connected'); setFile(null); setPct(0); setTxBytes(0); setElapsed('0.0'); }}>
              Send Another
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '0.82rem', justifyContent: 'center' }} onClick={disconnect}>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  RECEIVER COMPONENT
 * ══════════════════════════════════════════════════════════════ */
function ReceiverPanel({ sigStatus, myCode, sendSignal, onSignal, addToast }) {
  const [phase, setPhase] = useState('waiting');
  const [incoming, setIncoming] = useState(null);
  const [senderCode, setSender] = useState('');
  const [pct, setPct] = useState(0);
  const [speed, setSpeed] = useState('0.0');
  const [elapsed, setElapsed] = useState('0.0');
  const [rxBytes, setRxBytes] = useState(0);
  const [copied, setCopied] = useState(false);
  const [savedBlob, setSavedBlob] = useState(null);

  const pcRef = useRef(null);
  const chunksRef = useRef([]);
  const metaRef = useRef(null);
  const senderRef = useRef('');
  const t0Ref = useRef(null);
  const lastRef = useRef({ bytes: 0, time: Date.now() });

  useEffect(() => { senderRef.current = senderCode; }, [senderCode]);

  /* Handle incoming signals */
  useEffect(() => {
    onSignal.current = (msg) => {
      /* Incoming file request */
      if (msg.type === 'request') {
        if (phase === 'receiving') return; // already busy
        setIncoming({ name: msg.fileName, size: msg.fileSize });
        setSender(msg.from);
        setPhase('incoming');
        addToast(`📡 "${msg.fileName}" from ${msg.from}`, 'info');
        return;
      }
      /* WebRTC offer — complete the handshake */
      if (msg.type === 'offer') {
        acceptWebRTC(msg.from, msg.sdp);
        return;
      }
      /* ICE candidates from sender */
      if (msg.type === 'ice') {
        try { pcRef.current?.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch (_) { }
        return;
      }
    };
  }, [phase]); // eslint-disable-line

  const cleanup = () => {
    pcRef.current?.close();
    pcRef.current = null;
    chunksRef.current = [];
    metaRef.current = null;
  };

  /* User clicked Accept */
  const accept = () => {
    setPhase('accepting');
    sendSignal({ type: 'accept', to: senderRef.current });
    addToast('Accepted — waiting for WebRTC connection…', 'info');
  };

  /* Complete WebRTC handshake after receiving offer */
  const acceptWebRTC = async (fromCode, sdp) => {
    cleanup();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal({ type: 'ice', to: fromCode, candidate: candidate.toJSON() });
    };

    pc.ondatachannel = ({ channel }) => {
      addToast('WebRTC channel open — receiving…', 'success');
      t0Ref.current = Date.now();
      lastRef.current = { bytes: 0, time: Date.now() };
      setPhase('receiving');

      channel.onmessage = ({ data }) => {
        /* Text frame = metadata or done signal */
        if (typeof data === 'string') {
          const obj = JSON.parse(data);
          if (obj.type === 'meta') {
            metaRef.current = obj;
            chunksRef.current = [];
          }
          if (obj.type === 'done') {
            finalize();
          }
          return;
        }
        /* Binary frame = file chunk */
        chunksRef.current.push(data);
        const received = chunksRef.current.reduce((a, c) => a + c.byteLength, 0);
        const total = metaRef.current?.size ?? 0;
        const p = total ? (received / total) * 100 : 0;
        const now = Date.now();
        const dt = (now - lastRef.current.time) / 1000;
        let spd = speed;
        if (dt > 0.2) {
          spd = (((received - lastRef.current.bytes) / dt) / 1024 / 1024).toFixed(1);
          lastRef.current = { bytes: received, time: now };
        }
        const el = ((now - t0Ref.current) / 1000).toFixed(1);
        setPct(p);
        setSpeed(spd);
        setElapsed(el);
        setRxBytes(received);
      };
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal({ type: 'answer', to: fromCode, sdp: pc.localDescription });
  };

  const finalize = () => {
    const meta = metaRef.current;
    const blob = new Blob(chunksRef.current, { type: meta?.mime || 'application/octet-stream' });
    setSavedBlob({ blob, name: meta?.name || 'received-file' });
    setPhase('done');
    setPct(100);
    setRxBytes(meta?.size ?? 0);
    addToast(`✓ "${meta?.name}" received!`, 'success');
    cleanup();
  };

  const saveFile = () => {
    if (!savedBlob) return;
    const url = URL.createObjectURL(savedBlob.blob);
    const a = document.createElement('a');
    a.href = url; a.download = savedBlob.name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`"${savedBlob.name}" saved!`, 'success');
  };

  const reject = () => {
    sendSignal({ type: 'reject', to: senderRef.current });
    setIncoming(null); setSender(''); setPhase('waiting');
    addToast('Rejected.', 'info');
  };

  const reset = () => {
    cleanup();
    setPhase('waiting'); setIncoming(null); setSender('');
    setPct(0); setRxBytes(0); setElapsed('0.0'); setSavedBlob(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(myCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
    addToast('Receiver code copied!', 'success');
  };

  /* ── render ── */
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.9rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={14} color="var(--purple-primary)" />
        </div>
        <div><div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Receiver</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Accepts incoming files</div></div>
        {phase === 'incoming' && (
          <div style={{ marginLeft: 'auto', width: 9, height: 9, borderRadius: '50%', background: 'var(--color-warning)', boxShadow: '0 0 8px var(--color-warning)', animation: 'pulse 1s ease-in-out infinite' }} />
        )}
      </div>

      <SignalStatus status={sigStatus} />

      {/* receiver code */}
      <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 9, padding: '0.65rem 0.85rem', marginBottom: '0.9rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
          Your Receiver Code <span style={{ color: 'var(--purple-primary)', fontWeight: 600 }}>← share this with the sender</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--purple-primary)', wordBreak: 'break-all' }}>{myCode}</span>
          <button onClick={copyCode}
            style={{ background: copied ? 'var(--color-success-glow)' : 'rgba(167,139,250,0.15)', border: `1px solid ${copied ? 'var(--color-success)' : 'rgba(167,139,250,0.35)'}`, borderRadius: 7, cursor: 'pointer', color: copied ? 'var(--color-success)' : 'var(--purple-primary)', padding: '0.22rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Copy size={11} />{copied ? '✓ Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>

      {/* ── WAITING ── */}
      {phase === 'waiting' && (
        <div style={{ textAlign: 'center', padding: '1.6rem 1rem', border: '1px dashed rgba(167,139,250,0.2)', borderRadius: 11, background: 'rgba(167,139,250,0.03)' }}>
          <div className="processing-animation" style={{ margin: '0 auto 0.65rem', width: 50, height: 50 }}>
            <div className="glow-ring" style={{ borderColor: 'var(--purple-primary)', boxShadow: '0 0 14px var(--purple-glow)' }} />
            <ArrowDown size={16} className="inner-icon" style={{ color: 'var(--purple-primary)' }} />
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Listening for incoming transfers…<br />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Share your code with the sender — works across devices!
            </span>
          </p>
        </div>
      )}

      {/* ── INCOMING ── */}
      {(phase === 'incoming' || phase === 'accepting') && (
        <div style={{ animation: 'fadeIn 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'hsla(37,90%,51%,0.1)', border: '1px solid var(--color-warning)', borderRadius: 9, padding: '0.55rem 0.8rem', marginBottom: '0.85rem' }}>
            <Bell size={13} color="var(--color-warning)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600 }}>Incoming Transfer Request</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: 9, padding: '0.8rem', marginBottom: '0.85rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>From</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--purple-primary)', fontWeight: 700, marginBottom: '0.65rem' }}>{senderCode}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(56,189,248,0.05)', borderRadius: 7, padding: '0.6rem 0.8rem' }}>
              <File size={18} color="var(--cyan-primary)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{incoming?.name}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{fmtBytes(incoming?.size)}</div>
              </div>
            </div>
          </div>
          {phase === 'incoming' && (
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button className="btn btn-primary" onClick={accept} style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', background: 'linear-gradient(135deg,var(--purple-primary),var(--purple-dark))', boxShadow: '0 0 14px var(--purple-glow)' }}>
                <Download size={13} /> Accept
              </button>
              <button className="btn btn-secondary" onClick={reject} style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}>
                <X size={13} /> Reject
              </button>
            </div>
          )}
          {phase === 'accepting' && (
            <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
              <div className="processing-animation" style={{ margin: '0 auto 0.5rem', width: 40, height: 40 }}>
                <div className="glow-ring" style={{ borderColor: 'var(--purple-primary)' }} />
                <Activity size={14} className="inner-icon" style={{ color: 'var(--purple-primary)' }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Establishing WebRTC connection…</p>
            </div>
          )}
        </div>
      )}

      {/* ── RECEIVING ── */}
      {phase === 'receiving' && (
        <div style={{ animation: 'fadeIn 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.8rem' }}>
            <Radio size={11} color="var(--purple-primary)" className="inner-icon" />
            <span style={{ fontSize: '0.76rem', color: 'var(--purple-primary)' }}>
              Receiving from <strong style={{ fontFamily: 'var(--font-mono)' }}>{senderCode}</strong>
            </span>
          </div>
          <ProgressBlock pct={pct} bytes={rxBytes} total={incoming?.size}
            speed={speed} elapsed={elapsed}
            color="var(--purple-primary)" label="Receiving via WebRTC DataChannel" />
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: '0.4rem 0', animation: 'fadeIn 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--purple-primary)', marginBottom: '0.45rem' }}>
            <ShieldCheck size={18} /><strong>Received!</strong>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.9rem' }}>
            {incoming?.name} · {fmtBytes(incoming?.size)} · {elapsed}s
          </p>
          <div style={{ display: 'flex', gap: '0.55rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={saveFile}
              style={{ fontSize: '0.82rem', justifyContent: 'center', background: 'linear-gradient(135deg,var(--purple-primary),var(--purple-dark))', boxShadow: '0 0 14px var(--purple-glow)' }}>
              <Download size={13} /> Save File
            </button>
            <button className="btn btn-secondary" onClick={reset} style={{ fontSize: '0.82rem', justifyContent: 'center' }}>
              Receive Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  ROOT COMPONENT
 * ══════════════════════════════════════════════════════════════ */
export default function PeerSimulator({ addToast }) {
  /* Each panel gets its own signaling connection + peer code */
  const sender = useSignaling();
  const receiver = useSignaling();

  return (
    <div className="view-card glass-panel" id="peer-simulator-card">

      {/* header */}
      <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>Real WebRTC P2P Transfer</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.55 }}>
          Actual browser-to-browser transfer — works across different tabs, browsers, and devices on the same network.<br />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            File data flows directly — the signaling server only handles the handshake.
          </span>
        </p>
      </div>

      {/* how-to */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.2rem' }}>
        {[
          ['1', 'Start signal server: npm run dev:all'],
          ['2', 'Receiver copies their code'],
          ['3', 'Sender pastes code → Connect'],
          ['4', 'Pick file → Receiver accepts → Save'],
        ].map(([n, t]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 19, height: 19, borderRadius: '50%', background: 'var(--cyan-glow)', border: '1px solid var(--border-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--cyan-primary)', flexShrink: 0 }}>{n}</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{t}</span>
          </div>
        ))}
      </div>

      {/* dual panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(255px,1fr))', gap: '1.1rem', alignItems: 'start' }}>
        <div style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.14)', borderRadius: 13, padding: '1rem' }}>
          <SenderPanel {...sender} addToast={addToast} />
        </div>
        <div style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 13, padding: '1rem' }}>
          <ReceiverPanel {...receiver} addToast={addToast} />
        </div>
      </div>

      {/* cross-device tip */}
      <div style={{ marginTop: '1.1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)', borderRadius: 10, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.55, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <Wifi size={14} color="var(--cyan-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong style={{ color: 'var(--text-secondary)' }}>Using another laptop?</strong> Run <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '0.1rem 0.35rem' }}>npm run dev:all</code> on this machine, then open <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '0.1rem 0.35rem' }}>http://YOUR_IP:5173</code> on the other device. Both will connect to the same signal server automatically.
        </span>
      </div>
    </div>
  );
}
