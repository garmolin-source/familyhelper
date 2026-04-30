require('dotenv').config();

const MONITORED_GROUPS = (process.env.MONITORED_GROUPS || '')
  .split(',')
  .map((g) => g.trim())
  .filter(Boolean);

module.exports = {
  MONITORED_GROUPS,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'primary',
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_TO: process.env.EMAIL_TO,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  PORT: process.env.PORT || 3000,
  TODAY: () => {
    const d = new Date();
    return {
      date: d.toISOString().split('T')[0],
      dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'long' }),
    };
  },
};
