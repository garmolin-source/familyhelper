// Test the Claude → Calendar → Email pipeline without WhatsApp
// Usage: node scripts/test-pipeline.js
require('dotenv').config();
const { extractAction } = require('../src/claude');
const { createCalendarEvent } = require('../src/calendar');
const { sendDailyDigest } = require('../src/email');
const { addAction, flushActions } = require('../src/store');

const TEST_MESSAGE = 'שלום הורים, תזכורת שיש משחק כדורגל ביום שישי ב-10:00 במגרש אלונים. אנא הגיעו בזמן!';
const TEST_GROUP = 'בית ספר לכדורגל אלונים';

async function run() {
  console.log('=== Testing pipeline ===');
  console.log(`Group: ${TEST_GROUP}`);
  console.log(`Message: ${TEST_MESSAGE}\n`);

  console.log('1. Sending to Claude...');
  const action = await extractAction(TEST_MESSAGE, TEST_GROUP);
  console.log('Claude result:', JSON.stringify(action, null, 2));

  if (!action || action.type === null) {
    console.log('Claude found nothing actionable — done.');
    return;
  }

  if (action.type === 'event') {
    console.log('\n2. Creating calendar event...');
    await createCalendarEvent(action);
  }

  addAction(action, TEST_GROUP, TEST_MESSAGE);

  console.log('\n3. Sending daily digest email...');
  await sendDailyDigest(flushActions());

  console.log('\n=== Done! Check your email and Google Calendar ===');
}

run().catch(console.error);
