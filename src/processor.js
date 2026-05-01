const { extractActions } = require('./claude');
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

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    '';

  if (!text.trim()) return;

  console.log(`[${groupName}] Processing: ${text.substring(0, 80)}...`);

  const actions = await extractActions(text, groupName);
  if (!actions.length) {
    console.log(`[${groupName}] Nothing actionable found`);
    return;
  }

  console.log(`Claude extracted ${actions.length} item(s)`);

  for (const action of actions) {
    if (action.type === 'event') {
      await createCalendarEvent(action);
    } else if (action.type === 'task') {
      await createTask(action);
    }
    addAction(action, groupName, text);
    console.log(`  → [${action.type}] ${action.title}`);
  }
}

module.exports = { processMessage };
