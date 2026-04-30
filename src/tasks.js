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

  const task = {
    title: action.title,
    notes: action.details || '',
  };

  if (action.date) {
    // Google Tasks due date must be RFC 3339 with time set to midnight UTC
    task.due = `${action.date}T00:00:00.000Z`;
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
