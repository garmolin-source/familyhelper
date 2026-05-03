require('dotenv').config();
const { pickAndSignUp } = require('../src/sheets');
const { getChildForGroup } = require('../src/config');

const url = 'https://docs.google.com/spreadsheets/d/1wpMe6RzEaBYRckMP2dE5t8AndweGYOcDQqDEj3HNnpA/edit?usp=sharing';
const groupName = process.argv[2] || 'כיתה א׳2 אלונים - הורים';
const childInfo = getChildForGroup(groupName);
const signerName = childInfo?.child || 'אור';
const eventContext = `${groupName} - בדיקת רישום אוטומטי`;

console.log(`Group: ${groupName}`);
console.log(`Signing up as: ${signerName}\n`);

async function run() {
  console.log('Reading sheet and picking item...\n');
  const result = await pickAndSignUp(url, signerName, eventContext);
  if (!result) {
    console.log('No sign-up made — either no available items or not a sign-up sheet.');
  } else {
    console.log(`✅ Signed up!`);
    console.log(`Item: ${result.item}`);
    console.log(`Reason: ${result.reason}`);
  }
}

run().catch(console.error);
