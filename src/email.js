const nodemailer = require('nodemailer');
const { EMAIL_FROM, EMAIL_TO, EMAIL_PASSWORD } = require('./config');

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_FROM,
      pass: EMAIL_PASSWORD,
    },
  });
}

async function sendDailyDigest(items) {
  if (!EMAIL_FROM || !EMAIL_TO) return;

  const events = items.filter((i) => i.action.type === 'event');
  const tasks = items.filter((i) => i.action.type === 'task');

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Jerusalem',
  });

  let body = `סיכום יומי – ${today}\n${'='.repeat(50)}\n\n`;

  if (events.length > 0) {
    body += `📅 אירועים שנוספו ללוח השנה (${events.length})\n${'-'.repeat(40)}\n`;
    for (const { action, group } of events) {
      body += `• ${action.title}`;
      if (action.date) body += ` — ${action.date}`;
      if (action.time) body += ` at ${action.time}`;
      body += `\n  [${group}]`;
      if (action.details) body += `\n  ${action.details}`;
      body += '\n\n';
    }
  }

  if (tasks.length > 0) {
    body += `✅ משימות לביצוע (${tasks.length})\n${'-'.repeat(40)}\n`;
    for (const { action, group } of tasks) {
      body += `• ${action.title}`;
      if (action.date) body += ` — עד ${action.date}`;
      body += `\n  [${group}]`;
      if (action.details) body += `\n  ${action.details}`;
      body += '\n\n';
    }
  }

  try {
    await getTransporter().sendMail({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: `📋 Family Helper — סיכום יומי (${events.length} אירועים, ${tasks.length} משימות)`,
      text: body,
    });
    console.log('Daily digest sent to', EMAIL_TO);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

module.exports = { sendDailyDigest };
