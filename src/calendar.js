const { google } = require('googleapis');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
  GOOGLE_CALENDAR_ID,
} = require('./config');

const YELLOW = '5';

function getCalendarClient() {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

function subtractDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function getAttendees() {
  return (process.env.CALENDAR_ATTENDEES || '')
    .split(',').map((e) => e.trim()).filter(Boolean)
    .map((email) => ({ email }));
}

async function insertEvent(calendar, { summary, description, date, time }) {
  const isAllDay = !time;
  const start = isAllDay
    ? { date }
    : { dateTime: `${date}T${time}:00`, timeZone: 'Asia/Jerusalem' };

  let endTime = time;
  if (!isAllDay) {
    const [h, m] = time.split(':').map(Number);
    endTime = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const end = isAllDay
    ? { date }
    : { dateTime: `${date}T${endTime}:00`, timeZone: 'Asia/Jerusalem' };

  await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    sendUpdates: 'none',
    requestBody: {
      summary,
      description,
      colorId: YELLOW,
      start,
      end,
      attendees: getAttendees(),
    },
  });
  console.log(`Calendar event created: ${summary}`);
}

async function createCalendarEvent(action) {
  const calendar = getCalendarClient();
  const today = new Date().toISOString().split('T')[0];
  const description = action.url
    ? `${action.details || ''}\n\n🔗 ${action.url}`
    : action.details;

  try {
    if (action.type === 'event') {
      if (!action.date) return;
      await insertEvent(calendar, {
        summary: action.title,
        description,
        date: action.date,
        time: action.time,
      });

    } else if (action.type === 'buy') {
      const dueDate = action.date || today;
      const fallback = subtractDays(dueDate, 2);
      const reminderDate = action.reminder_date && action.reminder_date >= today
        ? action.reminder_date
        : (fallback >= today ? fallback : today);

      // Reminder to buy — a few days before
      await insertEvent(calendar, {
        summary: `🛒 לקנות: ${action.title}`,
        description,
        date: reminderDate,
      });

      // Reminder to bring — on the due day
      if (dueDate !== reminderDate) {
        await insertEvent(calendar, {
          summary: `🎒 להביא: ${action.title}`,
          description,
          date: dueDate,
        });
      }

    } else if (action.type === 'prepare') {
      const dueDate = action.date || today;
      const fallback = subtractDays(dueDate, 1);
      const reminderDate = action.reminder_date && action.reminder_date >= today
        ? action.reminder_date
        : (fallback >= today ? fallback : today);

      // Reminder to prepare — before the due date only, no day-of banner
      await insertEvent(calendar, {
        summary: `🧠 להכין: ${action.title}`,
        description,
        date: reminderDate,
      });
    }
  } catch (err) {
    console.error('Calendar error:', err.message);
  }
}

module.exports = { createCalendarEvent };
