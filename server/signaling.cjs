const { WebSocketServer, WebSocket } = require('ws');
const os = require('os');

const PORT = process.env.PORT || 9001;
const wss  = new WebSocketServer({ host: '0.0.0.0', port: PORT });


const peers = new Map();


function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function forward(msg, fromCode) {
  const target = peers.get(msg.to);
  if (target) {
    send(target, { ...msg, from: fromCode });
  } else {
    const src = peers.get(fromCode);
    send(src, { type: 'error', reason: `Peer "${msg.to}" not found or offline.` });
  }
}


function localIPs() {
  const result = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const n of list) {
      if (n.family === 'IPv4' && !n.internal) result.push(n.address);
    }
  }
  return result;
}

wss.on('connection', (ws) => {
  let myCode = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }


    if (msg.type === 'register') {
      myCode = msg.code;

      const old = peers.get(myCode);
      if (old && old !== ws) old.close();
      peers.set(myCode, ws);
      send(ws, { type: 'registered', code: myCode, peers: peers.size });
      console.log(`[+] Registered: ${myCode}  (total: ${peers.size})`);
      return;
    }


    if (msg.to && myCode) {
      forward(msg, myCode);
    }
  });

  ws.on('close', () => {
    if (myCode) {
      peers.delete(myCode);
      console.log(`[-] Left: ${myCode}  (total: ${peers.size})`);
    }
  });

  ws.on('error', () => {
    if (myCode) peers.delete(myCode);
  });
});


wss.on('listening', () => {
  const ips = localIPs();
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   CryptoTransfer Signaling Server  🔐         ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Local:    ws://localhost:${PORT}               ║`);
  ips.forEach(ip => {
    console.log(`║  Network:  ws://${ip.padEnd(15)}:${PORT}        ║`);
  });
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Share the Network address with other devices ║');
  console.log('╚══════════════════════════════════════════════╝\n');
});
