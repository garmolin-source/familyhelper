const { google } = require('googleapis');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
  GOOGLE_CALENDAR_ID,
} = require('./config');

const FLAMINGO = '5'; // Google Calendar colorId for Banana (yellow)
const PREP_HOUR = '08:30';
const PREP_DAYS_BEFORE = 3;

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

async function createCalendarEvent(action) {
  const calendar = getCalendarClient();

  let title = action.title;
  let startDate = action.date;
  let startTime = action.time;
  let isAllDay = !action.time;

  if (action.type === 'prep') {
    // Schedule reminder 3 days before the due date at 8:30am
    const dueDate = action.date || new Date().toISOString().split('T')[0];
    startDate = subtractDays(dueDate, PREP_DAYS_BEFORE);
    startTime = PREP_HOUR;
    isAllDay = false;
    title = `🛒 ${action.title} — needed ${action.date ? 'by ' + action.date : 'soon'}`;
  }

  if (!startDate) return null;

  const start = isAllDay
    ? { date: startDate }
    : { dateTime: `${startDate}T${startTime}:00`, timeZone: 'Asia/Jerusalem' };

  const end = isAllDay
    ? { date: startDate }
    : { dateTime: `${startDate}T${startTime}:00`, timeZone: 'Asia/Jerusalem' };

  // Add 1 hour duration for timed events
  if (!isAllDay) {
    const [h, m] = startTime.split(':').map(Number);
    const endHour = String(h + 1).padStart(2, '0');
    const endMin = String(m).padStart(2, '0');
    end.dateTime = `${startDate}T${endHour}:${endMin}:00`;
  }

  try {
    const event = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: title,
        description: action.details,
        colorId: FLAMINGO,
        start,
        end,
      },
    });
    console.log(`Calendar event created: ${title}`);
    return event.data.htmlLink;
  } catch (err) {
    console.error('Calendar error:', err.message);
    return null;
  }
}

module.exports = { createCalendarEvent };
