const { google } = require('googleapis');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
  GOOGLE_CALENDAR_ID,
} = require('./config');
const { storeEvent, removeEvent } = require('./event-store');

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

async function checkConflicts(calendar, date, time) {
  if (!time || !date) return [];
  try {
    const start = new Date(`${date}T${time}:00+03:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const res = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
    });
    return (res.data.items || []).filter((e) => e.colorId !== YELLOW); // exclude our own events
  } catch {
    return [];
  }
}

async function insertEvent(calendar, { summary, description, date, time, group }) {
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

  const res = await calendar.events.insert({
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

  if (group) {
    storeEvent({ eventId: res.data.id, group, title: summary, date, time });
  }

  return res.data;
}

async function createCalendarEvent(action) {
  const calendar = getCalendarClient();
  const today = new Date().toISOString().split('T')[0];
  const description = action.url
    ? `${action.details || ''}\n\n🔗 ${action.url}`
    : action.details;

  const conflicts = [];

  try {
    if (action.type === 'event') {
      if (!action.date) return { conflicts };

      const overlaps = await checkConflicts(calendar, action.date, action.time);
      if (overlaps.length) {
        conflicts.push(...overlaps.map((e) => ({ newEvent: action.title, conflictWith: e.summary, date: action.date, time: action.time })));
      }

      await insertEvent(calendar, {
        summary: action.title,
        description,
        date: action.date,
        time: action.time,
        group: action._group,
      });

    } else if (action.type === 'buy') {
      const dueDate = action.date || today;
      const fallback = subtractDays(dueDate, 2);
      const reminderDate = action.reminder_date && action.reminder_date >= today
        ? action.reminder_date
        : (fallback >= today ? fallback : today);

      await insertEvent(calendar, { summary: `🛒 לקנות: ${action.title}`, description, date: reminderDate });
      if (dueDate !== reminderDate) {
        await insertEvent(calendar, { summary: `🎒 להביא: ${action.title}`, description, date: dueDate });
      }

    } else if (action.type === 'prepare') {
      const dueDate = action.date || today;
      const fallback = subtractDays(dueDate, 1);
      const reminderDate = action.reminder_date && action.reminder_date >= today
        ? action.reminder_date
        : (fallback >= today ? fallback : today);

      await insertEvent(calendar, { summary: `🧠 להכין: ${action.title}`, description, date: reminderDate });
    }
  } catch (err) {
    console.error('Calendar error:', err.message);
  }

  return { conflicts };
}

async function updateCalendarEvent(eventId, changes) {
  const calendar = getCalendarClient();
  try {
    const existing = await calendar.events.get({ calendarId: GOOGLE_CALENDAR_ID, eventId });
    const patch = { ...existing.data };

    if (changes.title) patch.summary = changes.title;
    if (changes.details) patch.description = changes.details;
    if (changes.date && changes.time) {
      patch.start = { dateTime: `${changes.date}T${changes.time}:00`, timeZone: 'Asia/Jerusalem' };
      const [h, m] = changes.time.split(':').map(Number);
      const endTime = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      patch.end = { dateTime: `${changes.date}T${endTime}:00`, timeZone: 'Asia/Jerusalem' };
    } else if (changes.date) {
      patch.start = { date: changes.date };
      patch.end = { date: changes.date };
    } else if (changes.time) {
      const date = existing.data.start.dateTime?.split('T')[0] || existing.data.start.date;
      patch.start = { dateTime: `${date}T${changes.time}:00`, timeZone: 'Asia/Jerusalem' };
      const [h, m] = changes.time.split(':').map(Number);
      const endTime = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      patch.end = { dateTime: `${date}T${endTime}:00`, timeZone: 'Asia/Jerusalem' };
    }

    await calendar.events.update({ calendarId: GOOGLE_CALENDAR_ID, eventId, sendUpdates: 'none', requestBody: patch });
    console.log(`Calendar event updated: ${patch.summary}`);
    return patch.summary;
  } catch (err) {
    console.error('Update error:', err.message);
    return null;
  }
}

async function cancelCalendarEvent(eventId) {
  const calendar = getCalendarClient();
  try {
    await calendar.events.delete({ calendarId: GOOGLE_CALENDAR_ID, eventId, sendUpdates: 'none' });
    removeEvent(eventId);
    console.log(`Calendar event cancelled: ${eventId}`);
    return true;
  } catch (err) {
    console.error('Cancel error:', err.message);
    return false;
  }
}

module.exports = { createCalendarEvent, updateCalendarEvent, cancelCalendarEvent };
