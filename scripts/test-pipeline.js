// Test the Claude → Calendar → Email pipeline without WhatsApp
// Usage: node scripts/test-pipeline.js
require('dotenv').config();
const { extractAction } = require('../src/claude');
const { createCalendarEvent } = require('../src/calendar');
const { createTask } = require('../src/tasks');
const { sendDailyDigest } = require('../src/email');
const { addAction, flushActions } = require('../src/store');

const TESTS = [
  { message: 'שלום הורים, תזכורת שיש משחק כדורגל ביום שישי ב-10:00 במגרש אלונים. אנא הגיעו בזמן!', group: 'בית ספר לכדורגל אלונים' },
  { message: 'בבקשה להביא ביום ראשון קופסת צבעים וזוג מספריים לכיתה', group: 'כיתה א׳2 אלונים - הורים' },
];

async function run() {
  console.log('=== Testing pipeline ===\n');

  for (const { message, group } of TESTS) {
    console.log(`Group: ${group}`);
    console.log(`Message: ${message}`);

    const action = await extractAction(message, group);
    console.log('Claude result:', JSON.stringify(action, null, 2));

    if (!action || action.type === null) {
      console.log('→ Nothing actionable\n');
      continue;
    }

    if (action.type === 'event') {
      console.log('→ Creating calendar event...');
      await createCalendarEvent(action);
    } else if (action.type === 'task') {
      console.log('→ Creating Google Task...');
      await createTask(action);
    }

    addAction(action, group, message);
    console.log('→ Stored for digest\n');
  }

  console.log('Sending daily digest email...');
  await sendDailyDigest(flushActions());
  console.log('\n=== Done! Check your email, Google Calendar and Google Tasks ===');
}

run().catch(console.error);
