const { google } = require('googleapis');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
} = require('./config');

function getTasksClient() {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.tasks({ version: 'v1', auth });
}

async function createTask(action) {
  const tasks = getTasksClient();

  let notes = action.details || '';
  if (action.url) notes += `\n\n🔗 ${action.url}`;

  const task = {
    title: action.title,
    notes,
  };

  const dueDate = (action.type === 'buy' || action.type === 'prepare') && action.reminder_date
    ? action.reminder_date
    : action.date;

  if (dueDate) {
    task.due = `${dueDate}T00:00:00.000Z`;
  }

  try {
    const result = await tasks.tasks.insert({
      tasklist: '@default',
      requestBody: task,
    });
    console.log('Google Task created:', result.data.title);
    return result.data;
  } catch (err) {
    console.error('Tasks error:', err.message);
    return null;
  }
}

module.exports = { createTask };
