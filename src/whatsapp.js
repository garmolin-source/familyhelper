const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const { processMessage } = require('./processor');

const AUTH_DIR = path.join(__dirname, '..', 'auth_info');
let sock = null;
let qrCodeData = null;

function getQR() {
  return qrCodeData;
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrCodeData = qr;
      console.log('QR code ready — scan via /auth or terminal above');
    }
    if (connection === 'open') {
      qrCodeData = null;
      console.log('WhatsApp connected');
    }
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      console.log(`Connection closed (reason: ${reason}), reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) setTimeout(connectToWhatsApp, 3000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      if (msg.key.fromMe || !msg.key.remoteJid?.endsWith('@g.us')) continue;

      // Always process 'notify'. For 'append' (reconnect replay), only process
      // messages sent within the last 5 minutes to avoid reprocessing old history.
      if (type === 'append') {
        const msgTime = (msg.messageTimestamp || 0) * 1000;
        if (Date.now() - msgTime > 5 * 60 * 1000) continue;
      } else if (type !== 'notify') {
        continue;
      }

      await processMessage(sock, msg);
    }
  });
}

module.exports = { connectToWhatsApp, getQR };
