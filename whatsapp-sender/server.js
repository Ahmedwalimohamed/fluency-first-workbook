const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const PORT = Number(process.env.PORT || 3000);
const SESSION_PATH = process.env.SESSION_PATH || '/data/.wwebjs_auth';
const EXPECTED_SENDER = String(process.env.WHATSAPP_SENDER_NUMBER || '').trim();
const SEND_API_KEY = String(process.env.SEND_API_KEY || '');
const SELF_TEST_ID = String(process.env.SELF_TEST_ID || '').trim();
const expectedDigits = EXPECTED_SENDER.replace(/\D/g, '');
const digits = value => String(value || '').replace(/\D/g, '');

const app = express();
app.use(express.json({ limit: '32kb' }));

const state = {
  ready: false,
  authenticated: false,
  qrDataUrl: null,
  linkedNumber: null,
  lastError: null
};

function removeStaleChromeLocks(root) {
  if (!root || !fs.existsSync(root)) return;
  const names = new Set(['SingletonLock', 'SingletonCookie', 'SingletonSocket']);
  const walk = dir => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (names.has(entry.name)) {
        try { fs.rmSync(full, { force: true }); } catch {}
      }
    }
  };
  walk(root);
}

removeStaleChromeLocks(SESSION_PATH);

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--headless=new', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run', '--no-default-browser-check']
  }
});

client.on('qr', async qr => {
  state.ready = false;
  state.authenticated = false;
  state.linkedNumber = null;
  state.lastError = null;
  state.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 360 });
  console.log('EnglishGate WhatsApp QR ready for linking');
});

client.on('authenticated', () => {
  state.authenticated = true;
  state.lastError = null;
  console.log('EnglishGate WhatsApp authenticated');
});

client.on('ready', async () => {
  state.qrDataUrl = null;
  state.authenticated = true;
  state.linkedNumber = client.info?.wid?.user || null;
  if (expectedDigits && digits(state.linkedNumber) !== expectedDigits) {
    state.ready = false;
    state.lastError = `Wrong WhatsApp account linked. Expected ${EXPECTED_SENDER}.`;
    console.error(state.lastError);
    return;
  }
  state.ready = true;
  state.lastError = null;
  console.log(`EnglishGate WhatsApp ready as +${state.linkedNumber}`);

  if (SELF_TEST_ID && state.linkedNumber) {
    const markerName = '.self-test-' + crypto.createHash('sha256').update(SELF_TEST_ID).digest('hex').slice(0,16);
    const markerPath = path.join(path.dirname(SESSION_PATH), markerName);
    if (!fs.existsSync(markerPath)) {
      try {
        await sendTextMessage(state.linkedNumber, 'EnglishGate WhatsApp test: the dedicated sender is connected and can send messages.');
        fs.writeFileSync(markerPath, new Date().toISOString());
        console.log('EnglishGate WhatsApp self-test sent successfully');
      } catch (error) {
        console.error('EnglishGate WhatsApp self-test failed:', String(error?.message || error).slice(0,500));
      }
    }
  }
});

client.on('auth_failure', msg => {
  state.ready = false;
  state.authenticated = false;
  state.lastError = `Authentication failed: ${msg}`;
  console.error(state.lastError);
});

client.on('disconnected', reason => {
  state.ready = false;
  state.authenticated = false;
  state.lastError = `WhatsApp disconnected: ${reason}`;
  console.error(state.lastError);
});

function secureApiKey(value) {
  const supplied = Buffer.from(String(value || ''));
  const expected = Buffer.from(SEND_API_KEY);
  return supplied.length === expected.length && expected.length > 0 && crypto.timingSafeEqual(supplied, expected);
}

async function sendTextMessage(recipientPhone, message) {
  const recipient = digits(recipientPhone);
  if (!/^\d{8,15}$/.test(recipient)) throw new Error('Recipient WhatsApp number is invalid');
  const text = String(message || '').trim();
  if (!text || text.length > 3000) throw new Error('Message must contain 1–3000 characters');
  if (!state.ready) throw new Error('WhatsApp sender is not connected');
  const chatId = `${recipient}@c.us`;
  const registered = await client.isRegisteredUser(chatId);
  if (!registered) throw new Error('Recipient number is not registered on WhatsApp');
  await client.sendMessage(chatId, text);
  return { recipient: `+${recipient}` };
}

app.post('/api/send-text', async (req, res) => {
  if (!SEND_API_KEY) return res.status(503).json({ error: 'Text messaging API is not configured' });
  if (!secureApiKey(req.get('x-api-key'))) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const sent = await sendTextMessage(req.body?.recipient, req.body?.message);
    res.json({ ok: true, ...sent });
  } catch (error) {
    const message = String(error?.message || error).slice(0, 500);
    console.error('EnglishGate WhatsApp send failed:', message);
    const status = /not connected/i.test(message) ? 503 : /not registered|invalid|characters/i.test(message) ? 400 : 502;
    res.status(status).json({ error: message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    ready: state.ready,
    authenticated: state.authenticated,
    linkedNumber: state.linkedNumber,
    expectedSender: EXPECTED_SENDER || null,
    lastError: state.lastError
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    ready: state.ready,
    authenticated: state.authenticated,
    linkedNumber: state.linkedNumber,
    expectedSender: EXPECTED_SENDER || null,
    lastError: state.lastError,
    qrAvailable: Boolean(state.qrDataUrl)
  });
});

app.get('/', (req, res) => {
  const status = state.ready ? 'Connected' : state.qrDataUrl ? 'Scan the QR code' : 'Starting WhatsApp…';
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>EnglishGate WhatsApp Sender</title><style>body{font-family:system-ui;background:#f6f7f9;margin:0;padding:32px;color:#17191c}.card{max-width:540px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,.06)}h1{font-size:24px;margin:0 0 8px}.status{font-weight:700;margin:16px 0}.ok{color:#16794b}.bad{color:#b42318}img{display:block;max-width:360px;width:100%;margin:20px auto}.muted{color:#667085;font-size:14px;line-height:1.5}</style></head><body><div class="card"><h1>EnglishGate WhatsApp Sender</h1><div class="status ${state.ready ? 'ok' : ''}">${status}</div>${EXPECTED_SENDER ? `<p class="muted">Expected sender: ${EXPECTED_SENDER}</p>` : `<p class="muted">No sender number locked yet. Link the WhatsApp account you want to dedicate to EnglishGate, then configure WHATSAPP_SENDER_NUMBER.</p>`}${state.qrDataUrl ? `<img src="${state.qrDataUrl}" alt="WhatsApp linking QR">` : ''}${state.linkedNumber ? `<p>Linked number: +${state.linkedNumber}</p>` : ''}${state.lastError ? `<p class="bad">${state.lastError}</p>` : ''}<p class="muted">On the EnglishGate WhatsApp account: WhatsApp → Linked devices → Link a device, then scan this QR.</p></div></body></html>`);
});

client.initialize().catch(err => {
  state.lastError = String(err?.message || err);
  console.error('EnglishGate WhatsApp initialization failed:', state.lastError);
});

app.listen(PORT, () => console.log(`EnglishGate WhatsApp sender listening on ${PORT}`));
