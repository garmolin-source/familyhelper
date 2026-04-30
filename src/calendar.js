const { google } = require('googleapis');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
  GOOGLE_CALENDAR_ID,
} = require('./config');

function getCalendarClient() {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

async function createCalendarEvent(action) {
  if (!action.date) {
    console.log('No date — skipping calendar, will appear as task in email');
    return null;
  }

  const calendar = getCalendarClient();

  const start = action.time
    ? { dateTime: `${action.date}T${action.time}:00`, timeZone: 'Asia/Jerusalem' }
    : { date: action.date };

  const end = action.time
    ? { dateTime: `${action.date}T${action.time}:00`, timeZone: 'Asia/Jerusalem' }
    : { date: action.date };

  // For timed events, default to 1 hour duration
  if (action.time) {
    const [h, m] = action.time.split(':').map(Number);
    const endHour = h + 1;
    end.dateTime = `${action.date}T${String(endHour).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }

  try {
    const event = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: action.title,
        description: action.details,
        start,
        end,
      },
    });
    console.log('Calendar event created:', event.data.htmlLink);
    return event.data.htmlLink;
  } catch (err) {
    console.error('Calendar error:', err.message);
    return null;
  }
}

module.exports = { createCalendarEvent };
