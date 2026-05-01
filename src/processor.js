const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { extractActions, extractActionsFromImage } = require('./claude');
const { createCalendarEvent } = require('./calendar');
const { createTask } = require('./tasks');
const { addAction } = require('./store');
const { MONITORED_GROUPS } = require('./config');

const processedIds = new Set();

async function processMessage(sock, msg) {
  const msgId = msg.key.id;
  if (processedIds.has(msgId)) return;
  processedIds.add(msgId);

  const groupJid = msg.key.remoteJid;

  let groupName = '';
  try {
    const meta = await sock.groupMetadata(groupJid);
    groupName = meta.subject;
  } catch {
    return;
  }

  const matchedGroup = MONITORED_GROUPS.find((g) =>
    groupName.toLowerCase().includes(g.toLowerCase())
  );
  if (!matchedGroup) return;

  const m = msg.message;
  let actions = [];

  // Image message — send to Claude vision (reads flyers, posters, text in images)
  if (m?.imageMessage) {
    const caption = m.imageMessage.caption || '';
    console.log(`[${groupName}] Image message (caption: "${caption.substring(0, 60)}")`);
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: { level: 'silent', child: () => ({}) } });
      const base64 = buffer.toString('base64');
      actions = await extractActionsFromImage(base64, caption, groupName);
    } catch (err) {
      console.error('Image download error:', err.message);
      // Fall back to caption only if image download fails
      if (caption) actions = await extractActions(caption, groupName);
    }

  // Document/file message — read caption
  } else if (m?.documentMessage) {
    const caption = m.documentMessage.caption || m.documentMessage.fileName || '';
    if (!caption.trim()) return;
    console.log(`[${groupName}] Document: ${caption.substring(0, 80)}`);
    actions = await extractActions(caption, groupName);

  // Video message — read caption
  } else if (m?.videoMessage) {
    const caption = m.videoMessage.caption || '';
    if (!caption.trim()) return;
    console.log(`[${groupName}] Video caption: ${caption.substring(0, 80)}`);
    actions = await extractActions(caption, groupName);

  // Regular text message
  } else {
    const text =
      m?.conversation ||
      m?.extendedTextMessage?.text ||
      '';
    if (!text.trim()) return;
    console.log(`[${groupName}] Text: ${text.substring(0, 80)}...`);
    actions = await extractActions(text, groupName);
  }

  if (!actions.length) {
    console.log(`[${groupName}] Nothing actionable found`);
    return;
  }

  console.log(`Claude extracted ${actions.length} item(s)`);

  for (const action of actions) {
    if (action.type === 'event') {
      await createCalendarEvent(action);
    } else if (action.type === 'buy' || action.type === 'prepare') {
      await createCalendarEvent(action);
      await createTask(action);
    } else if (action.type === 'task') {
      await createTask(action);
    }
    addAction(action, groupName, action.title);
    console.log(`  → [${action.type}] ${action.title}`);
  }
}

module.exports = { processMessage };
