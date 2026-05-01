// Test image extraction pipeline
// Usage: node scripts/test-image.js /path/to/image.jpg "Group Name"
require('dotenv').config();
const fs = require('fs');
const { extractActionsFromImage } = require('../src/claude');
const { createCalendarEvent } = require('../src/calendar');
const { createTask } = require('../src/tasks');

const imagePath = process.argv[2];
const groupName = process.argv[3] || 'כיתה א׳2 אלונים - הורים';

if (!imagePath) {
  console.error('Usage: node scripts/test-image.js /path/to/image.jpg "Group Name"');
  process.exit(1);
}

async function run() {
  console.log(`=== Testing image pipeline ===`);
  console.log(`Image: ${imagePath}`);
  console.log(`Group: ${groupName}\n`);

  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString('base64');

  console.log('Sending to Claude vision...');
  const actions = await extractActionsFromImage(base64, '', groupName);
  console.log(`\nClaude found ${actions.length} item(s):\n`);

  for (const action of actions) {
    console.log(`  [${action.type}] ${action.title} — ${action.date || 'no date'}`);
    console.log(`  Details: ${action.details}\n`);

    if (action.type === 'event') {
      await createCalendarEvent(action);
    } else if (action.type === 'buy' || action.type === 'prepare') {
      await createCalendarEvent(action);
      await createTask(action);
    } else if (action.type === 'task') {
      await createTask(action);
    }
  }

  console.log('=== Done! Check your Google Calendar ===');
}

run().catch(console.error);
