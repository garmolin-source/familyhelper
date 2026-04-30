const express = require('express');
const qrcode = require('qrcode-terminal');
const { getQR } = require('./whatsapp');
const { PORT } = require('./config');

const app = express();

app.get('/', (req, res) => {
  res.send('Family Helper is running.');
});

// Serve QR code for re-authentication
app.get('/auth', (req, res) => {
  const qr = getQR();
  if (!qr) {
    return res.send('<p>Already authenticated — no QR code needed.</p>');
  }

  // Render QR as ASCII in a <pre> tag for quick access
  let ascii = '';
  qrcode.generate(qr, { small: true }, (output) => {
    ascii = output;
  });

  res.send(`
    <html>
      <body style="background:#000;color:#0f0;font-family:monospace;padding:20px">
        <h2 style="color:#0f0">Scan this QR with WhatsApp → Linked Devices</h2>
        <pre style="font-size:10px;line-height:1">${ascii}</pre>
        <p>Refresh this page if the QR expired.</p>
      </body>
    </html>
  `);
});

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} — visit /auth to scan QR`);
  });
}

module.exports = { startServer };
