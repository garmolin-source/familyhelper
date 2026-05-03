// Run once: node scripts/get-token.js
// Prints the refresh token to paste into .env
require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const { exec } = require('child_process');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT = 'http://localhost:4242';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first');
  process.exit(1);
}

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);

const url = auth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

console.log('\nOpening browser for Google authorization...');
exec(`open "${url}"`);

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get('code');
  if (!code) return res.end('No code found.');

  try {
    const { tokens } = await auth.getToken(code);
    res.end('<h2>Success! Check your terminal for the refresh token.</h2>');
    console.log('\n✅ Add this to your .env:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    server.close();
  } catch (err) {
    res.end('Error: ' + err.message);
    console.error(err);
  }
});

server.listen(4242, () => {
  console.log('Waiting for Google to redirect back...');
});
