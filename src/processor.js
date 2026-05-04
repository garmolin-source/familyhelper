const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { extractActions, extractActionsFromImage } = require('./claude');
const { createCalendarEvent, updateCalendarEvent, cancelCalendarEvent } = require('./calendar');
const { createTask, updateTask } = require('./tasks');
const { addAction } = require('./store');
const { findBestMatch } = require('./event-store');
const { pickAndSignUp } = require('./sheets');
const { sendImmediateEmail } = require('./email');
const { MONITORED_GROUPS, getChildForGroup } = require('./config');

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

  const childInfo = getChildForGroup(groupName);
  const m = msg.message;
  let actions = [];

  if (m?.imageMessage) {
    const caption = m.imageMessage.caption || '';
    console.log(`[${groupName}] Image message`);
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: { level: 'silent', child: () => ({}) } });
      const base64 = buffer.toString('base64');
      actions = await extractActionsFromImage(base64, caption, groupName, childInfo);
    } catch (err) {
      console.error('Image download error:', err.message);
      if (caption) actions = await extractActions(caption, groupName, childInfo);
    }
  } else if (m?.documentMessage) {
    const caption = m.documentMessage.caption || m.documentMessage.fileName || '';
    if (!caption.trim()) return;
    actions = await extractActions(caption, groupName, childInfo);
  } else if (m?.videoMessage) {
    const caption = m.videoMessage.caption || '';
    if (!caption.trim()) return;
    actions = await extractActions(caption, groupName, childInfo);
  } else {
    const text = m?.conversation || m?.extendedTextMessage?.text || '';
    if (!text.trim()) return;
    console.log(`[${groupName}] Text: ${text.substring(0, 80)}...`);
    actions = await extractActions(text, groupName, childInfo);
  }

  if (!actions.length) {
    console.log(`[${groupName}] Nothing actionable found`);
    return;
  }

  console.log(`Claude extracted ${actions.length} item(s)`);

  for (const action of actions) {
    action._group = groupName;

    if (action.type === 'event') {
      const { conflicts, eventIds } = await createCalendarEvent(action);
      if (conflicts?.length) action._conflicts = conflicts;

    } else if (action.type === 'buy' || action.type === 'prepare') {
      const { eventIds } = await createCalendarEvent(action);
      const taskResult = await createTask(action);

      // Auto sign-up if there's a sheet URL (e.g. "bring something" + sign-up sheet)
      if (action.url && action.url.includes('spreadsheets')) {
        const signerName = childInfo?.child || 'אור';
        const signup = await pickAndSignUp(action.url, signerName, `${groupName}: ${action.title}`);
        if (signup) {
          action.details = (action.details || '') + `\n\n✍️ נרשמת אוטומטית להביא: ${signup.item}`;
          const updatedTitle = `${action.title} — ${signup.item}`;
          const updatedNotes = action.details + `\nסיבה: ${signup.reason}`;
          // Update calendar events to reflect the specific item
          for (const eventId of eventIds || []) {
            await updateCalendarEvent(eventId, { title: updatedTitle, details: updatedNotes });
          }
          // Update task to reflect the specific item
          if (taskResult?.id) {
            await updateTask(taskResult.id, { title: updatedTitle, notes: updatedNotes });
          }
          await sendImmediateEmail({
            subject: `✍️ נרשמת ל: ${signup.item} — ${action.title}`,
            body: `Family Helper נרשם אוטומטית בשמך.\n\nאירוע: ${action.title}\nקבוצה: ${groupName}\nפריט שנבחר: ${signup.item}\nסיבה: ${signup.reason}\n\n🔗 לשינוי: ${signup.url}`,
          });
        }
      }

    } else if (action.type === 'task') {
      const taskResult = await createTask(action);

      // Auto sign-up if there's a sheet URL
      if (action.url && action.url.includes('spreadsheets')) {
        const signerName = childInfo?.child || 'אור';
        const signup = await pickAndSignUp(action.url, signerName, `${groupName}: ${action.title}`);
        if (signup) {
          action.details = (action.details || '') + `\n\n✍️ נרשמת אוטומטית להביא: ${signup.item}`;
          const updatedTitle = `${action.title} — ${signup.item}`;
          const updatedNotes = action.details + `\nסיבה: ${signup.reason}`;
          // Update task to reflect the specific item
          if (taskResult?.id) {
            await updateTask(taskResult.id, { title: updatedTitle, notes: updatedNotes });
          }
          await sendImmediateEmail({
            subject: `✍️ נרשמת ל: ${signup.item} — ${action.title}`,
            body: `Family Helper נרשם אוטומטית בשמך.\n\nאירוע: ${action.title}\nקבוצה: ${groupName}\nפריט שנבחר: ${signup.item}\nסיבה: ${signup.reason}\n\n🔗 לשינוי: ${signup.url}`,
          });
        }
      }

    } else if (action.type === 'update') {
      const match = findBestMatch({ group: groupName, keywords: action.search_keywords, date: action.date });
      if (match) {
        await updateCalendarEvent(match.eventId, action.changes || {});
        action._updatedEvent = match.title;
      } else {
        console.log(`  → Could not find original event to update`);
      }

    } else if (action.type === 'cancel') {
      const match = findBestMatch({ group: groupName, keywords: action.search_keywords, date: action.date });
      if (match) {
        await cancelCalendarEvent(match.eventId);
        action._cancelledEvent = match.title;
      } else {
        console.log(`  → Could not find original event to cancel`);
      }
    }

    addAction(action, groupName, action.title);
    console.log(`  → [${action.type}] ${action.title}`);
  }
}

module.exports = { processMessage };
