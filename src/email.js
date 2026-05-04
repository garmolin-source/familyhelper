const nodemailer = require('nodemailer');
const { EMAIL_FROM, EMAIL_TO, EMAIL_PASSWORD } = require('./config');

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_FROM,
      pass: EMAIL_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

async function sendImmediateEmail({ subject, body }) {
  if (!EMAIL_FROM || !EMAIL_TO) return;
  try {
    await getTransporter().sendMail({ from: EMAIL_FROM, to: EMAIL_TO, subject, text: body });
    console.log('Immediate email sent:', subject);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

async function sendDailyDigest(items) {
  if (!EMAIL_FROM || !EMAIL_TO) return;

  const events = items.filter((i) => i.action.type === 'event');
  const buys = items.filter((i) => i.action.type === 'buy');
  const prepares = items.filter((i) => i.action.type === 'prepare');
  const tasks = items.filter((i) => i.action.type === 'task');
  const updates = items.filter((i) => i.action.type === 'update');
  const cancels = items.filter((i) => i.action.type === 'cancel');
  const ideas = items.filter((i) => i.action.type === 'idea');
  const conflicts = items.flatMap((i) => i.action._conflicts || []);

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Jerusalem',
  });

  let body = `סיכום יומי – ${today}\n${'='.repeat(50)}\n\n`;

  if (conflicts.length > 0) {
    body += `⚠️ התנגשויות ביומן (${conflicts.length})\n${'-'.repeat(40)}\n`;
    for (const c of conflicts) {
      body += `• "${c.newEvent}" מתנגש עם "${c.conflictWith}"\n`;
      body += `  ${c.date}${c.time ? ' בשעה ' + c.time : ''}\n\n`;
    }
  }

  if (updates.length > 0) {
    body += `✏️ עדכונים לאירועים קיימים (${updates.length})\n${'-'.repeat(40)}\n`;
    for (const { action } of updates) {
      body += `• ${action.title}`;
      if (action._updatedEvent) body += ` ← עדכן: "${action._updatedEvent}"`;
      body += `\n  ${action.details || ''}\n\n`;
    }
  }

  if (cancels.length > 0) {
    body += `❌ ביטולים (${cancels.length})\n${'-'.repeat(40)}\n`;
    for (const { action } of cancels) {
      body += `• ${action.title}`;
      if (action._cancelledEvent) body += ` ← בוטל: "${action._cancelledEvent}"`;
      body += '\n\n';
    }
  }


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

  if (ideas.length > 0) {
    body += `💡 רעיונות להעשרה עם הילדים (${ideas.length})\n${'-'.repeat(40)}\n`;
    body += `(השראה ממה שקרה היום בכיתה/גן — לא חובה, רק אם בא לכם)\n\n`;
    for (const { action, group } of ideas) {
      body += `• ${action.title}`;
      body += `\n  [${group}]`;
      if (action.details) body += `\n  ${action.details}`;
      body += '\n\n';
    }
  }

  const total = events.length + buys.length + prepares.length + tasks.length + updates.length + cancels.length;
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

module.exports = { sendDailyDigest, sendImmediateEmail };
