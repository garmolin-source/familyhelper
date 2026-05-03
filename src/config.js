require('dotenv').config();

const MONITORED_GROUPS = (process.env.MONITORED_GROUPS || '')
  .split(',')
  .map((g) => g.trim())
  .filter(Boolean);

// Which child each group belongs to (partial match on group name)
const GROUP_CHILD_MAP = [
  { keywords: ['כיתה א', 'מהמורה', 'מעגלי צהריים', 'כדורגל', 'ג׳ודו'], child: 'כרמי', age: 7, grade: 'כיתה א׳' },
  { keywords: ['גן רון', 'צהרון רון', 'תנועה יצירתית'], child: 'ארז', age: 4.5, grade: 'גן חובה' },
  { keywords: ['כדורשת אילנות'], child: null, owner: 'אור', grade: 'קבוצת כדורשת' },
  { keywords: ['גרמולין ניב זינגר', 'משפחת גרמולין'], child: null, owner: 'both', grade: 'משפחה' },
];

function getChildForGroup(groupName) {
  const lower = groupName.toLowerCase();
  for (const entry of GROUP_CHILD_MAP) {
    if (entry.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return entry;
    }
  }
  return null;
}

module.exports = {
  MONITORED_GROUPS,
  GROUP_CHILD_MAP,
  getChildForGroup,
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
