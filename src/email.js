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
  const buys = items.filter((i) => i.action.type === 'buy');
  const prepares = items.filter((i) => i.action.type === 'prepare');
  const tasks = items.filter((i) => i.action.type === 'task');

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Jerusalem',
  });

  let body = `סיכום יומי – ${today}\n${'='.repeat(50)}\n\n`;

  if (events.length > 0) {
    body += `📅 אירועים ביומן (${events.length})\n${'-'.repeat(40)}\n`;
    for (const { action, group } of events) {
      body += `• ${action.title}`;
      if (action.date) body += ` — ${action.date}`;
      if (action.time) body += ` at ${action.time}`;
      body += `\n  [${group}]`;
      if (action.details) body += `\n  ${action.details}`;
      body += '\n\n';
    }
  }

  if (buys.length > 0) {
    body += `🛒 דברים לקנות ולהביא (${buys.length})\n${'-'.repeat(40)}\n`;
    for (const { action, group } of buys) {
      body += `• ${action.title}`;
      if (action.date) body += ` — נדרש עד ${action.date}`;
      body += `\n  [${group}]`;
      if (action.details) body += `\n  ${action.details}`;
      body += '\n\n';
    }
  }

  if (prepares.length > 0) {
    body += `🧠 דברים להתכונן אליהם (${prepares.length})\n${'-'.repeat(40)}\n`;
    for (const { action, group } of prepares) {
      body += `• ${action.title}`;
      if (action.date) body += ` — עד ${action.date}`;
      body += `\n  [${group}]`;
      if (action.details) body += `\n  ${action.details}`;
      body += '\n\n';
    }
  }

  if (tasks.length > 0) {
    body += `✅ משימות לביצוע (${tasks.length})\n${'-'.repeat(40)}\n`;
    for (const { action, group } of tasks) {
      body += `• ${action.title}`;
      body += `\n  [${group}]`;
      if (action.details) body += `\n  ${action.details}`;
      body += '\n\n';
    }
  }

  const total = events.length + buys.length + prepares.length + tasks.length;
  try {
    await getTransporter().sendMail({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: `📋 Family Helper — סיכום יומי (${total} פריטים)`,
      text: body,
    });
    console.log('Daily digest sent to', EMAIL_TO);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

module.exports = { sendDailyDigest };
