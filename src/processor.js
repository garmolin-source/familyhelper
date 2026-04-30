const { extractAction } = require('./claude');
const { createCalendarEvent } = require('./calendar');
const { addAction } = require('./store');
const { MONITORED_GROUPS } = require('./config');

const processedIds = new Set();

async function processMessage(sock, msg) {
  const msgId = msg.key.id;
  if (processedIds.has(msgId)) return;
  processedIds.add(msgId);

  const groupJid = msg.key.remoteJid;

  // Fetch group metadata to get the group name
  let groupName = '';
  try {
    const meta = await sock.groupMetadata(groupJid);
    groupName = meta.subject;
  } catch {
    return;
  }

  // Check if this is a monitored group
  const matchedGroup = MONITORED_GROUPS.find((g) =>
    groupName.toLowerCase().includes(g.toLowerCase())
  );
  if (!matchedGroup) return;

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    '';

  if (!text.trim()) return;

  console.log(`[${groupName}] Processing: ${text.substring(0, 80)}...`);

  const action = await extractAction(text, groupName);
  if (!action || action.type === null) return;

  console.log('Claude extracted:', JSON.stringify(action));

  if (action.type === 'event') {
    await createCalendarEvent(action);
  }

  addAction(action, groupName, text);
  console.log(`Stored for digest: [${action.type}] ${action.title}`);
}

module.exports = { processMessage };
