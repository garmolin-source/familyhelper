// Test the Claude → Calendar → Email pipeline without WhatsApp
// Usage: node scripts/test-pipeline.js
require('dotenv').config();
const { extractActions } = require('../src/claude');
const { createCalendarEvent } = require('../src/calendar');
const { createTask } = require('../src/tasks');
const { sendDailyDigest } = require('../src/email');
const { addAction, flushActions } = require('../src/store');

// Simulates a typical long teacher message with multiple actionable items
const TESTS = [
  {
    group: 'כיתה א׳2 אלונים - הורים',
    message: `ניפגש בשני הקרוב ב-17:30 בחורשת אבנר (מול המרכז המסחרי בברודצקי) לפעילות יצירת עששיות והכנת פיתות על הסאג׳.

נבקש מכולם להביא לכל ילד צנצנת קטנה להכנת עששית וקישוטים (מדבקות, נייר קרפ, דבק, מספריים וכו׳), מים, צלחת, כוס וסכו״ם רב פעמי.

מוזמנים להשתבץ בקובץ המצורף (ולהוסיף דברים שתרצו להביא לארוחת ערב קלילה`,
  },
  {
    group: 'הודעות מהמורה שלי כיתה א׳2',
    message: `הורים יקרים 🤍

עבר עלינו שבוע נעים ומלא למידה.
למדנו את התנועה החדשה קובוץ ושורוק, ושילבנו אותה בקריאה ובכתיבה.
בנוסף, תרגלנו חיבור וחיסור עד 20 דרך משחקים ופעילויות חווייתיות.

שמתי לב שבהפסקות הילדים משחקים בעיקר כדורגל, ולכן החלטנו להסדיר זאת:
כדורגל ישוחק בימי שני ורביעי בלבד, ובשאר הימים הילדים יוכלו לבחור משחקים מגוונים אחרים.

ביום ראשון אקיים הכתבה במסגרת "אליפות המילים" 🏆
הילדים נדרשים לכתוב את המילים באותיות כתב ולנקד:
סוס, דובון, עוגה, ילדה, ילד

מומלץ לתרגל בבית על לוח מחיק או במחברת.

אני מאמינה בילדים ובילדות שלכם מאוד. הם אלופים ואני סומכת עליהם! 💪✨

בנוסף, מצורף הסבר על שוק "קח תן". למי שיש שאלות, ניתן לפנות למשפחת רויכמן.

שבת שלום,`,
  },
];

async function run() {
  console.log('=== Testing multi-action pipeline ===\n');

  for (const { message, group } of TESTS) {
    console.log(`Group: ${group}`);
    console.log(`Message:\n${message}\n`);

    const actions = await extractActions(message, group);
    console.log(`Claude found ${actions.length} item(s):\n`);

    for (const action of actions) {
      console.log(`  [${action.type}] ${action.title} — ${action.date || 'no date'}`);
      console.log(`  Details: ${action.details}\n`);

      if (action.type === 'event') {
        await createCalendarEvent(action);
      } else if (action.type === 'prep') {
        await createCalendarEvent(action);
        await createTask(action);
      } else if (action.type === 'task') {
        await createTask(action);
      }

      addAction(action, group, message);
    }
  }

  console.log('\nSending daily digest email...');
  await sendDailyDigest(flushActions());
  console.log('\n=== Done! Check your email, Google Calendar and Google Tasks ===');
}

run().catch(console.error);
