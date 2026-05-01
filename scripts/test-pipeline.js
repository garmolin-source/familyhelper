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
    message: `שלום הורים יקרים,
כמה עדכונים חשובים לשבוע הקרוב:

אירוע: ביום חמישי ה-7.5 בשעה 17:00 יתקיים מופע סיום שנה באולם בית הספר. נא להגיע ב-16:45. ההורים מוזמנים.

ציוד: בבקשה להביא ביום שני זוג מספריים וסרגל לשיעור אומנות.

שיעורי בית: יש לסיים את דף העבודה במתמטיקה עמוד 12 עד יום ראשון.

משימה: יש להחזיר טופס הסכמה חתום למחנכת - אין תאריך אחרון אך בבקשה בהקדם.

תשלום: יש לשלם את דמי ההשתתפות לטיול ביום ראשון דרך האפליקציה, סכום של 45 ש״ח.

תודה ושבת שלום 🙏`,
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
