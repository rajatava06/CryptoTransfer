/**
 * PeerSimulator.jsx – Real WebRTC P2P via PeerJS
 * ─────────────────────────────────────────────────
 * Uses PeerJS (free cloud signaling at 0.peerjs.com over WSS).
 * Works on Vercel and any HTTPS host — no local server needed.
 *
 * Features:
 *  • AES-256-GCM file encryption before DataChannel send
 *  • Encryption key exchanged safely via the WebRTC DTLS channel
 *  • Real progress tracking with speed + elapsed time
 *  • Works across different devices / networks globally
 */

import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import {
  Share2, Upload, File, ShieldCheck, Zap, Activity,
  X, Radio, CheckCircle2, ArrowRight, ArrowLeft,
  Download, Bell, Copy, ArrowDown, Wifi, WifiOff,
  AlertCircle, Lock, Unlock,
} from 'lucide-react';

/* ─── PeerJS config ────────────────────────────────────────── */
const PEER_CFG = {
  host:   '0.peerjs.com',
  port:   443,
  path:   '/',
  secure: true,           // wss:// — required on HTTPS / Vercel
  debug:  0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  },
};

const CHUNK_SIZE = 16384; // 16 KB

/* ─── Helpers ──────────────────────────────────────────────── */
const genCode  = () => `CT-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
const fmtBytes = (b) => {
  if (!b) return '0 B';
  const k = 1024, u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / k ** i).toFixed(2))} ${u[i]}`;
};

/* ─── AES-256-GCM ──────────────────────────────────────────── */
const buf2b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
const b642buf = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;

async function encryptFile(buf) {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf);
  const raw = await crypto.subtle.exportKey('raw', key);
  return { enc, keyB64: buf2b64(raw), ivB64: buf2b64(iv.buffer) };
}

async function decryptFile(encBuf, keyB64, ivB64) {
  const key = await crypto.subtle.importKey(
    'raw', b642buf(keyB64), { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(b642buf(ivB64)) }, key, encBuf
  );
}

/* ─── usePeer hook ─────────────────────────────────────────── */
function usePeer(myCode) {
  const [status,   setStatus]   = useState('connecting'); // connecting|connected|error
  const [errMsg,   setErrMsg]   = useState('');
  const peerRef = useRef(null);

  useEffect(() => {
    if (!myCode) return;
    const p = new Peer(myCode, PEER_CFG);
    peerRef.current = p;

    p.on('open',         ()    => setStatus('connected'));
    p.on('disconnected', ()    => { setStatus('error'); p.reconnect(); });
    p.on('error',        (err) => {
      if (err.type === 'unavailable-id') {
        // Collision — handled by parent regenerating the code
        setErrMsg('Peer ID collision — refreshing…');
      } else {
        setStatus('error');
        setErrMsg(err.message || err.type);
      }
    });

    return () => { p.destroy(); peerRef.current = null; };
  }, [myCode]);

  return { peerRef, status, errMsg };
}

/* ─── Status badge ─────────────────────────────────────────── */
function StatusBadge({ status, errMsg }) {
  const cfg = {
    connecting: { c: 'var(--color-warning)', ic: <Activity size={11} />, t: 'Connecting to PeerJS cloud…' },
    connected:  { c: 'var(--color-success)', ic: <Wifi     size={11} />, t: 'Connected — ready for transfer' },
    error:      { c: 'var(--color-error)',   ic: <WifiOff  size={11} />, t: errMsg || 'Connection error' },
  };
  const s = cfg[status] || cfg.connecting;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.71rem', color: s.c,
      background: `${s.c}18`, border: `1px solid ${s.c}45`, borderRadius: 7, padding: '0.3rem 0.65rem', marginBottom: '0.8rem' }}>
      {s.ic}<span>{s.t}</span>
    </div>
  );
}

/* ─── Code box ─────────────────────────────────────────────── */
function CodeBox({ code, label, color, hint }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ background: `${color}0e`, border: `1px solid ${color}35`, borderRadius: 9,
      padding: '0.6rem 0.8rem', marginBottom: '0.8rem' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 700, color, letterSpacing: '0.06em' }}>
          {code || '…'}
        </span>
        <button onClick={copy}
          style={{ background: copied ? 'var(--color-success-glow)' : `${color}18`,
            border: `1px solid ${copied ? 'var(--color-success)' : color + '40'}`,
            borderRadius: 6, cursor: 'pointer',
            color: copied ? 'var(--color-success)' : color,
            padding: '0.18rem 0.55rem', fontSize: '0.68rem',
            display: 'flex', alignItems: 'center', gap: 3,
            transition: 'all 0.2s', flexShrink: 0 }}>
          <Copy size={10} />{copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {hint && <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{hint}</p>}
    </div>
  );
}

/* ─── ChunkGrid ─────────────────────────────────────────────── */
function ChunkGrid({ pct, color }) {
  const done = Math.ceil((Math.min(pct, 100) / 100) * 40);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 4, maxWidth: 280, margin: '0 auto 0.9rem' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{
          aspectRatio: '1', borderRadius: 3,
          background: i < done ? color : 'rgba(255,255,255,0.05)',
          boxShadow:  i < done ? `0 0 4px ${color}` : 'none',
          transition: 'background 0.1s, box-shadow 0.1s',
        }} />
      ))}
    </div>
  );
}

/* ─── ProgressBlock ─────────────────────────────────────────── */
function ProgressBlock({ pct, bytes, total, speed, elapsed, color, label, encrypted }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', marginBottom:'0.7rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.86rem', margin: 0 }}>{label}</p>
        {encrypted && (
          <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:'0.63rem',
            background:'var(--color-success-glow)', border:'1px solid var(--color-success)',
            borderRadius:5, padding:'0.08rem 0.38rem', color:'var(--color-success)' }}>
            <Lock size={8} /> AES-256
          </span>
        )}
      </div>
      <ChunkGrid pct={pct} color={color} />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.77rem', marginBottom:'0.3rem' }}>
        <span style={{ color:'var(--text-muted)' }}>{fmtBytes(bytes)} / {fmtBytes(total)}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontWeight:700 }}>{Math.min(100,Math.round(pct))}%</span>
      </div>
      <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:100, overflow:'hidden', marginBottom:'0.4rem' }}>
        <div style={{ height:'100%', width:`${Math.min(100,pct)}%`, background:color, transition:'width 0.12s linear' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', color:'var(--text-muted)' }}>
        <span>⏱ {elapsed}s</span><span>⚡ {speed} MB/s</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  SENDER PANEL
 * ══════════════════════════════════════════════════════════════ */
function SenderPanel({ addToast }) {
  const [myCode]              = useState(genCode);
  const { peerRef, status, errMsg } = usePeer(myCode);

  const [targetCode, setTarget] = useState('');
  const [phase, setPhase]       = useState('idle');   // idle|connected|awaiting|encrypting|sending|done
  const [file, setFile]         = useState(null);
  const [pct, setPct]           = useState(0);
  const [speed, setSpeed]       = useState('0.0');
  const [elapsed, setElapsed]   = useState('0.0');
  const [txBytes, setTxBytes]   = useState(0);
  const [isDrag, setIsDrag]     = useState(false);
  const [connErr, setConnErr]   = useState('');

  const connRef    = useRef(null);
  const fileRef    = useRef(null);
  const targetRef  = useRef('');
  const t0Ref      = useRef(null);
  const lastRef    = useRef({ b: 0, t: Date.now() });
  const inputRef   = useRef(null);

  useEffect(() => { fileRef.current  = file;       }, [file]);
  useEffect(() => { targetRef.current = targetCode; }, [targetCode]);

  /* Open connection to receiver */
  const connect = (e) => {
    e.preventDefault();
    const tc = targetCode.trim().toUpperCase();
    if (!tc || status !== 'connected') return;
    setConnErr('');

    const conn = peerRef.current.connect(tc, {
      reliable: true,
      serialization: 'binary',
    });
    connRef.current = conn;

    conn.on('open', () => {
      setPhase('connected');
      addToast('Connected! Pick a file to send.', 'success');
    });

    conn.on('data', (raw) => {
      if (typeof raw !== 'string') return;
      const msg = JSON.parse(raw);
      if (msg.type === 'accept') {
        addToast('Receiver accepted! Encrypting…', 'success');
        runSend(fileRef.current, conn);
      }
      if (msg.type === 'reject') {
        setPhase('connected');
        addToast('Receiver rejected the transfer.', 'info');
      }
    });

    conn.on('error', (err) => {
      setConnErr(err.message || 'Connection failed');
      setPhase('idle');
      addToast('Connection error: ' + err.message, 'error');
    });

    conn.on('close', () => {
      if (phase !== 'done') {
        setPhase('idle');
        addToast('Connection closed.', 'info');
      }
    });
  };

  /* Send the transfer request */
  const sendRequest = () => {
    const f = fileRef.current;
    if (!f || !connRef.current) return;
    connRef.current.send(JSON.stringify({
      type: 'request', fileName: f.name, fileSize: f.size,
    }));
    setPhase('awaiting');
    addToast('Request sent — waiting for receiver…', 'info');
  };

  /* Encrypt then stream */
  const runSend = async (f, conn) => {
    setPhase('encrypting');
    try {
      const raw   = await f.arrayBuffer();
      const { enc, keyB64, ivB64 } = await encryptFile(raw);

      /* Send key + metadata first (protected by WebRTC DTLS) */
      conn.send(JSON.stringify({
        type: 'key', keyB64, ivB64,
        meta: { name: f.name, size: enc.byteLength, origSize: f.size, mime: f.type || 'application/octet-stream' },
      }));

      setPhase('sending');
      t0Ref.current = Date.now();
      lastRef.current = { b: 0, t: Date.now() };
      const total  = enc.byteLength;
      let   offset = 0;

      const tick = () => {
        if (conn.dataChannel && conn.dataChannel.bufferedAmount > 8 * CHUNK_SIZE) {
          setTimeout(tick, 30); return;
        }
        const slice = enc.slice(offset, offset + CHUNK_SIZE);
        conn.send(slice);
        offset += slice.byteLength;

        const p   = (offset / total) * 100;
        const now = Date.now();
        const dt  = (now - lastRef.current.t) / 1000;
        let   spd = speed;
        if (dt > 0.15) {
          spd = (((offset - lastRef.current.b) / dt) / 1048576).toFixed(1);
          lastRef.current = { b: offset, t: now };
        }
        const el = ((now - t0Ref.current) / 1000).toFixed(1);
        setPct(p); setSpeed(spd); setElapsed(el); setTxBytes(offset);

        if (offset < total) {
          setTimeout(tick, 0);
        } else {
          conn.send(JSON.stringify({ type: 'done' }));
          setTimeout(() => {
            setPhase('done');
            addToast(`✓ "${f.name}" sent — encrypted with AES-256-GCM!`, 'success');
          }, 300);
        }
      };
      tick();
    } catch (err) {
      setPhase('connected');
      addToast('Encryption error: ' + err.message, 'error');
    }
  };

  const disconnect = () => {
    connRef.current?.close();
    connRef.current = null;
    setPhase('idle'); setFile(null); setTarget('');
    setPct(0); setTxBytes(0); setElapsed('0.0');
  };

  const onDrag = (e) => { e.preventDefault(); setIsDrag(e.type !== 'dragleave' && e.type !== 'drop'); };
  const onDrop = (e) => { e.preventDefault(); setIsDrag(false); pick(e.dataTransfer?.files?.[0]); };
  const onFile = (e) => { pick(e.target.files?.[0]); e.target.value = ''; };
  const pick   = (f) => { if (f) { setFile(f); setPct(0); setTxBytes(0); setElapsed('0.0'); } };

  /* ── render ── */
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* header */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.8rem', paddingBottom:'0.6rem', borderBottom:'1px solid var(--border-dim)' }}>
        <div style={{ width:27, height:27, borderRadius:7, background:'rgba(56,189,248,0.15)', border:'1px solid rgba(56,189,248,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ArrowRight size={13} color="var(--cyan-primary)" />
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.88rem' }}>Sender</div>
          <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>Encrypts &amp; sends files</div>
        </div>
      </div>

      <StatusBadge status={status} errMsg={errMsg} />

      <CodeBox
        code={myCode}
        label="Your Sender Code"
        color="var(--cyan-primary)"
        hint="Share this if others want to send you files"
      />

      {connErr && (
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'var(--color-error-glow)', border:'1px solid var(--color-error)', borderRadius:7, padding:'0.4rem 0.7rem', marginBottom:'0.8rem', fontSize:'0.77rem', color:'var(--color-error)' }}>
          <AlertCircle size={12} />{connErr}
        </div>
      )}

      {/* IDLE */}
      {phase === 'idle' && (
        <form onSubmit={connect}>
          <div className="form-group" style={{ marginBottom:'0.8rem' }}>
            <label className="form-label" htmlFor="s-target" style={{ fontSize:'0.78rem', marginBottom:'0.3rem' }}>
              Receiver's Code
            </label>
            <input id="s-target" className="form-input" type="text"
              placeholder="CT-XXXXX"
              value={targetCode} onChange={e => setTarget(e.target.value.toUpperCase())}
              autoComplete="off" spellCheck={false}
              style={{ fontSize:'0.9rem', fontFamily:'var(--font-mono)', letterSpacing:'0.05em' }}
              disabled={status !== 'connected'}
            />
          </div>
          <button className="btn btn-primary" type="submit"
            disabled={!targetCode.trim() || status !== 'connected'}
            style={{ justifyContent:'center' }}>
            <Share2 size={14} /> Connect
          </button>
        </form>
      )}

      {/* CONNECTED: file picker */}
      {phase === 'connected' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', marginBottom:'0.75rem' }}>
            <Radio size={11} color="var(--color-success)" className="inner-icon" />
            <span style={{ fontSize:'0.75rem', color:'var(--color-success)' }}>
              Connected → <strong style={{ fontFamily:'var(--font-mono)' }}>{targetCode}</strong>
            </span>
          </div>

          {!file ? (
            <div className={`dropzone ${isDrag ? 'active' : ''}`}
              onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              style={{ padding:'1.3rem 1rem', cursor:'pointer', marginBottom:'0.7rem' }}>
              <input ref={inputRef} type="file" style={{ display:'none' }} onChange={onFile} />
              <div className="dropzone-icon-container" style={{ width:'2.2rem', height:'2.2rem' }}><Upload size={14} /></div>
              <div className="dropzone-text">
                <span className="dropzone-title" style={{ fontSize:'0.82rem' }}>Drop or click to pick file</span>
                <span className="dropzone-desc" style={{ fontSize:'0.71rem' }}>Will be AES-256-GCM encrypted</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="selected-file-card" style={{ marginBottom:'0.7rem' }}>
                <div className="file-info-layout">
                  <div className="file-icon"><File size={19} /></div>
                  <div className="file-meta">
                    <span className="file-name" style={{ maxWidth:130, fontSize:'0.81rem' }}>{file.name}</span>
                    <span className="file-size">{fmtBytes(file.size)}</span>
                  </div>
                </div>
                <button className="remove-file-btn" onClick={() => setFile(null)}><X size={13} /></button>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.7rem', color:'var(--color-success)', background:'var(--color-success-glow)', borderRadius:7, padding:'0.25rem 0.6rem', marginBottom:'0.7rem' }}>
                <Lock size={10} /> AES-256-GCM encryption applied before transfer
              </div>
              <button className="btn btn-primary" onClick={sendRequest} style={{ justifyContent:'center' }}>
                <Zap size={14} /> Encrypt &amp; Send
              </button>
            </div>
          )}

          <button className="btn btn-secondary" onClick={disconnect}
            style={{ marginTop:'0.6rem', justifyContent:'center', opacity:0.6, fontSize:'0.8rem' }}>
            Disconnect
          </button>
        </div>
      )}

      {/* AWAITING */}
      {phase === 'awaiting' && (
        <div style={{ textAlign:'center', padding:'1.4rem 0' }}>
          <div className="processing-animation" style={{ margin:'0 auto 0.6rem', width:48, height:48 }}>
            <div className="glow-ring" /><Activity size={16} className="inner-icon" />
          </div>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.81rem' }}>Waiting for receiver to accept…</p>
          <p style={{ color:'var(--text-muted)', fontSize:'0.72rem', marginTop:'0.25rem' }}>"{file?.name}"</p>
          <button className="btn btn-secondary" onClick={disconnect} style={{ marginTop:'0.85rem', fontSize:'0.78rem', justifyContent:'center', opacity:0.6 }}>Cancel</button>
        </div>
      )}

      {/* ENCRYPTING */}
      {phase === 'encrypting' && (
        <div style={{ textAlign:'center', padding:'1.4rem 0' }}>
          <div className="processing-animation" style={{ margin:'0 auto 0.6rem', width:48, height:48 }}>
            <div className="glow-ring" style={{ borderColor:'var(--color-success)' }} />
            <Lock size={16} className="inner-icon" style={{ color:'var(--color-success)' }} />
          </div>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.81rem' }}>Encrypting with AES-256-GCM…</p>
        </div>
      )}

      {/* SENDING */}
      {phase === 'sending' && (
        <ProgressBlock pct={pct} bytes={txBytes} total={file?.size}
          speed={speed} elapsed={elapsed}
          color="var(--cyan-primary)" label="Sending Encrypted File" encrypted />
      )}

      {/* DONE */}
      {phase === 'done' && (
        <div style={{ textAlign:'center', padding:'0.4rem 0' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', color:'var(--color-success)', marginBottom:'0.4rem' }}>
            <CheckCircle2 size={17} /><strong>Sent &amp; Encrypted!</strong>
          </div>
          <p style={{ fontSize:'0.79rem', color:'var(--text-secondary)', marginBottom:'0.85rem' }}>
            {file?.name} · {fmtBytes(file?.size)} · {elapsed}s
          </p>
          <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn btn-primary" style={{ fontSize:'0.8rem', justifyContent:'center' }}
              onClick={() => { setPhase('connected'); setFile(null); setPct(0); setTxBytes(0); setElapsed('0.0'); }}>
              Send Another
            </button>
            <button className="btn btn-secondary" style={{ fontSize:'0.8rem', justifyContent:'center' }} onClick={disconnect}>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  RECEIVER PANEL
 * ══════════════════════════════════════════════════════════════ */
function ReceiverPanel({ addToast }) {
  const [myCode]              = useState(genCode);
  const { peerRef, status, errMsg } = usePeer(myCode);

  const [phase, setPhase]       = useState('waiting');
  const [incoming, setIncoming] = useState(null);     // { name, size }
  const [senderCode, setSender] = useState('');
  const [pct, setPct]           = useState(0);
  const [speed, setSpeed]       = useState('0.0');
  const [elapsed, setElapsed]   = useState('0.0');
  const [rxBytes, setRxBytes]   = useState(0);
  const [savedBlob, setSaved]   = useState(null);
  const [decrypting, setDec]    = useState(false);

  const connRef   = useRef(null);
  const chunksRef = useRef([]);
  const metaRef   = useRef(null);
  const keyRef    = useRef(null);
  const t0Ref     = useRef(null);
  const lastRef   = useRef({ b: 0, t: Date.now() });
  const phaseRef  = useRef('waiting');

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* Listen for incoming connections */
  useEffect(() => {
    const peer = peerRef.current;
    if (!peer || status !== 'connected') return;

    const onConn = (conn) => {
      conn.on('data', (raw) => {
        if (typeof raw === 'string') {
          const msg = JSON.parse(raw);

          if (msg.type === 'request') {
            if (phaseRef.current === 'receiving') return;
            connRef.current = conn;
            setIncoming({ name: msg.fileName, size: msg.fileSize });
            setSender(conn.peer);
            setPhase('incoming');
            chunksRef.current = [];
            metaRef.current   = null;
            keyRef.current    = null;
            addToast(`📡 "${msg.fileName}" from ${conn.peer}`, 'info');
          }

          if (msg.type === 'key') {
            keyRef.current  = { keyB64: msg.keyB64, ivB64: msg.ivB64 };
            metaRef.current = msg.meta;
            chunksRef.current = [];
          }

          if (msg.type === 'done') {
            finalize();
          }
        } else {
          /* Binary chunk */
          chunksRef.current.push(raw);
          const received = chunksRef.current.reduce((a, c) => a + c.byteLength, 0);
          const total    = metaRef.current?.size ?? 0;
          const p        = total ? (received / total) * 100 : 0;
          const now      = Date.now();
          const dt       = (now - lastRef.current.t) / 1000;
          let   spd      = '0.0';
          if (dt > 0.15) {
            spd = (((received - lastRef.current.b) / dt) / 1048576).toFixed(1);
            lastRef.current = { b: received, t: now };
          }
          const el = ((now - t0Ref.current) / 1000).toFixed(1);
          setPct(p); setSpeed(spd); setElapsed(el); setRxBytes(received);
        }
      });

      conn.on('close', () => {
        if (phaseRef.current !== 'done') {
          setPhase('waiting');
          addToast('Sender disconnected.', 'info');
        }
      });
    };

    peer.on('connection', onConn);
    return () => peer.off('connection', onConn);
  }, [status]); // eslint-disable-line

  const accept = () => {
    connRef.current?.send(JSON.stringify({ type: 'accept' }));
    setPhase('receiving');
    t0Ref.current = Date.now();
    lastRef.current = { b: 0, t: Date.now() };
    addToast('Accepted — receiving…', 'info');
  };

  const reject = () => {
    connRef.current?.send(JSON.stringify({ type: 'reject' }));
    connRef.current?.close();
    connRef.current = null;
    setIncoming(null); setSender(''); setPhase('waiting');
    addToast('Rejected.', 'info');
  };

  const finalize = async () => {
    setDec(true);
    try {
      const encBuf    = await new Blob(chunksRef.current).arrayBuffer();
      const { keyB64, ivB64 } = keyRef.current;
      const decBuf    = await decryptFile(encBuf, keyB64, ivB64);
      const meta      = metaRef.current;
      const blob      = new Blob([decBuf], { type: meta?.mime || 'application/octet-stream' });
      setSaved({ blob, name: meta?.name || 'received-file' });
      setPhase('done'); setPct(100);
      setRxBytes(meta?.origSize ?? encBuf.byteLength);
      addToast(`✓ "${meta?.name}" decrypted & ready!`, 'success');
    } catch (err) {
      addToast('Decryption failed: ' + err.message, 'error');
      setPhase('waiting');
    } finally {
      setDec(false);
      chunksRef.current = [];
    }
  };

  const saveFile = () => {
    if (!savedBlob) return;
    const url = URL.createObjectURL(savedBlob.blob);
    const a   = document.createElement('a');
    a.href = url; a.download = savedBlob.name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    addToast(`"${savedBlob.name}" saved!`, 'success');
  };

  const reset = () => {
    connRef.current?.close(); connRef.current = null;
    setPhase('waiting'); setIncoming(null); setSender('');
    setPct(0); setRxBytes(0); setElapsed('0.0'); setSaved(null);
    chunksRef.current = []; metaRef.current = null; keyRef.current = null;
  };

  /* ── render ── */
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* header */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.8rem', paddingBottom:'0.6rem', borderBottom:'1px solid var(--border-dim)' }}>
        <div style={{ width:27, height:27, borderRadius:7, background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ArrowLeft size={13} color="var(--purple-primary)" />
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.88rem' }}>Receiver</div>
          <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>Decrypts &amp; saves files</div>
        </div>
        {phase === 'incoming' && (
          <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'var(--color-warning)', boxShadow:'0 0 8px var(--color-warning)', animation:'pulse 1s ease-in-out infinite' }} />
        )}
      </div>

      <StatusBadge status={status} errMsg={errMsg} />

      <CodeBox
        code={myCode}
        label="Your Receiver Code — share this with the Sender"
        color="var(--purple-primary)"
        hint="Anyone with this code can send you a file"
      />

      {/* WAITING */}
      {phase === 'waiting' && (
        <div style={{ textAlign:'center', padding:'1.5rem 1rem', border:'1px dashed rgba(167,139,250,0.22)', borderRadius:11, background:'rgba(167,139,250,0.03)' }}>
          <div className="processing-animation" style={{ margin:'0 auto 0.6rem', width:48, height:48 }}>
            <div className="glow-ring" style={{ borderColor:'var(--purple-primary)', boxShadow:'0 0 14px var(--purple-glow)' }} />
            <ArrowDown size={15} className="inner-icon" style={{ color:'var(--purple-primary)' }} />
          </div>
          <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)', lineHeight:1.55 }}>
            Listening for incoming files…<br />
            <span style={{ fontSize:'0.71rem', color:'var(--text-muted)' }}>Works across any device worldwide</span>
          </p>
        </div>
      )}

      {/* INCOMING */}
      {(phase === 'incoming') && (
        <div style={{ animation:'fadeIn 0.2s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'hsla(37,90%,51%,0.1)', border:'1px solid var(--color-warning)', borderRadius:8, padding:'0.45rem 0.75rem', marginBottom:'0.75rem' }}>
            <Bell size={12} color="var(--color-warning)" />
            <span style={{ fontSize:'0.77rem', color:'var(--color-warning)', fontWeight:600 }}>Incoming Transfer</span>
          </div>
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--border-dim)', borderRadius:9, padding:'0.75rem', marginBottom:'0.75rem' }}>
            <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginBottom:'0.2rem' }}>From</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.82rem', color:'var(--purple-primary)', fontWeight:700, marginBottom:'0.6rem' }}>{senderCode}</div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.55rem', background:'rgba(56,189,248,0.05)', borderRadius:7, padding:'0.5rem 0.75rem' }}>
              <File size={16} color="var(--cyan-primary)" style={{ flexShrink:0 }} />
              <div>
                <div style={{ fontWeight:600, fontSize:'0.83rem' }}>{incoming?.name}</div>
                <div style={{ fontSize:'0.71rem', color:'var(--text-muted)' }}>{fmtBytes(incoming?.size)}</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.68rem', color:'var(--color-success)', marginTop:'0.5rem' }}>
              <Lock size={9} /> File is AES-256-GCM encrypted — decrypted after receive
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button className="btn btn-primary" onClick={accept}
              style={{ flex:1, justifyContent:'center', fontSize:'0.83rem', background:'linear-gradient(135deg,var(--purple-primary),var(--purple-dark))', boxShadow:'0 0 12px var(--purple-glow)' }}>
              <Download size={12} /> Accept
            </button>
            <button className="btn btn-secondary" onClick={reject} style={{ flex:1, justifyContent:'center', fontSize:'0.83rem' }}>
              <X size={12} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* RECEIVING */}
      {phase === 'receiving' && (
        <div style={{ animation:'fadeIn 0.2s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', marginBottom:'0.7rem' }}>
            <Radio size={11} color="var(--purple-primary)" className="inner-icon" />
            <span style={{ fontSize:'0.74rem', color:'var(--purple-primary)' }}>
              From <strong style={{ fontFamily:'var(--font-mono)' }}>{senderCode}</strong>
            </span>
          </div>
          <ProgressBlock pct={pct} bytes={rxBytes} total={incoming?.size}
            speed={speed} elapsed={elapsed}
            color="var(--purple-primary)" label="Receiving Encrypted File" encrypted />
        </div>
      )}

      {/* DECRYPTING */}
      {decrypting && (
        <div style={{ textAlign:'center', padding:'1rem 0' }}>
          <div className="processing-animation" style={{ margin:'0 auto 0.55rem', width:44, height:44 }}>
            <div className="glow-ring" style={{ borderColor:'var(--color-success)' }} />
            <Unlock size={14} className="inner-icon" style={{ color:'var(--color-success)' }} />
          </div>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.79rem' }}>Decrypting AES-256-GCM…</p>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && !decrypting && (
        <div style={{ textAlign:'center', padding:'0.4rem 0', animation:'fadeIn 0.2s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', color:'var(--purple-primary)', marginBottom:'0.4rem' }}>
            <ShieldCheck size={17} /><strong>Received &amp; Decrypted!</strong>
          </div>
          <p style={{ fontSize:'0.79rem', color:'var(--text-secondary)', marginBottom:'0.85rem' }}>
            {incoming?.name} · {fmtBytes(incoming?.size)} · {elapsed}s
          </p>
          <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn btn-primary" onClick={saveFile}
              style={{ fontSize:'0.8rem', justifyContent:'center', background:'linear-gradient(135deg,var(--purple-primary),var(--purple-dark))', boxShadow:'0 0 12px var(--purple-glow)' }}>
              <Download size={12} /> Save File
            </button>
            <button className="btn btn-secondary" onClick={reset} style={{ fontSize:'0.8rem', justifyContent:'center' }}>
              Receive Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  ROOT
 * ══════════════════════════════════════════════════════════════ */
export default function PeerSimulator({ addToast }) {
  return (
    <div className="view-card glass-panel" id="peer-simulator-card">

      <div style={{ textAlign:'center', marginBottom:'1.1rem' }}>
        <h2 style={{ fontSize:'1.5rem', marginBottom:'0.3rem' }}>
          Encrypted P2P File Transfer
        </h2>
        <p style={{ color:'var(--text-secondary)', fontSize:'0.84rem', lineHeight:1.55 }}>
          Files are <strong style={{ color:'var(--color-success)' }}>AES-256-GCM encrypted</strong> before leaving your device.<br />
          <span style={{ color:'var(--text-muted)', fontSize:'0.76rem' }}>
            Powered by WebRTC via PeerJS — works globally, no server required.
          </span>
        </p>
      </div>

      {/* steps */}
      <div style={{ display:'flex', gap:'0.45rem', flexWrap:'wrap', justifyContent:'center', marginBottom:'1.1rem' }}>
        {[
          ['1', 'Receiver copies their Code'],
          ['2', 'Sender pastes code → Connect'],
          ['3', 'Pick file → Encrypt & Send'],
          ['4', 'Receiver accepts → Save File'],
        ].map(([n, t]) => (
          <div key={n} style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
            <span style={{ width:17, height:17, borderRadius:'50%', background:'var(--cyan-glow)', border:'1px solid var(--border-glow)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.62rem', fontWeight:700, color:'var(--cyan-primary)', flexShrink:0 }}>{n}</span>
            <span style={{ fontSize:'0.73rem', color:'var(--text-secondary)' }}>{t}</span>
          </div>
        ))}
      </div>

      {/* dual panel */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(255px,1fr))', gap:'1rem', alignItems:'start' }}>
        <div style={{ background:'rgba(56,189,248,0.04)', border:'1px solid rgba(56,189,248,0.14)', borderRadius:13, padding:'0.95rem' }}>
          <SenderPanel addToast={addToast} />
        </div>
        <div style={{ background:'rgba(167,139,250,0.04)', border:'1px solid rgba(167,139,250,0.18)', borderRadius:13, padding:'0.95rem' }}>
          <ReceiverPanel addToast={addToast} />
        </div>
      </div>

      {/* footer note */}
      <div style={{ marginTop:'1rem', padding:'0.65rem 0.85rem', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-dim)', borderRadius:10, fontSize:'0.73rem', color:'var(--text-muted)', lineHeight:1.6, display:'flex', gap:'0.4rem', alignItems:'flex-start' }}>
        <ShieldCheck size={12} color="var(--color-success)" style={{ flexShrink:0, marginTop:2 }} />
        <span>
          <strong style={{ color:'var(--text-secondary)' }}>Double encryption:</strong> Files are AES-256-GCM encrypted in your browser before entering the WebRTC DataChannel (which is itself DTLS-encrypted). The AES key is shared via the DTLS-protected channel — the PeerJS signaling server never sees file data or keys.
        </span>
      </div>
    </div>
  );
}
