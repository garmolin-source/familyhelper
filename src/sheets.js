const { google } = require('googleapis');
const Anthropic = require('@anthropic-ai/sdk');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
} = require('./config');

function getSheetsClient() {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

async function readSheet(spreadsheetId) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:Z100',
  });
  return res.data.values || [];
}

async function writeToSheet(spreadsheetId, row, col, value) {
  const sheets = getSheetsClient();
  const colLetter = String.fromCharCode(64 + col);
  const range = `${colLetter}${row}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
  console.log(`Sheet updated: row ${row}, col ${colLetter} = "${value}"`);
}

async function pickAndSignUp(url, signerName, eventContext) {
  const spreadsheetId = extractSheetId(url);
  if (!spreadsheetId) return null;

  const rows = await readSheet(spreadsheetId);
  if (!rows.length) return null;

  // Convert sheet data to readable text for Claude
  const sheetText = rows.map((row, i) =>
    `שורה ${i + 1}: ${row.map((cell, j) => `[עמודה ${j + 1}]: ${cell}`).join(' | ')}`
  ).join('\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `אתה עוזר שצריך להירשם לגיליון אקסל של אירוע משפחתי/בית ספרי.

הקשר האירוע: ${eventContext}
שם הרושם: ${signerName}

נתוני הגיליון:
${sheetText}

כללי העדפה לבחירת פריט:
- עדיף: פריטים שניתן לקנות כמו שהם בסופרמרקט (חומוס, יין, שתייה, פיתות, לחם, שוקולד, עוגה מוכנה, פירות)
- להימנע: פריטים שדורשים הכנה בבית (ירקות חתוכים, סלט, אוכל מבושל, עוגה ביתית, כל מה שצריך לחתוך/לבשל/לאפות)
- בחר פריט שעדיין פנוי (אין שם רשום לידו)
- אם יש כמות מבוקשת (כמו "2 בקבוקי יין"), ציין אותה

החזר JSON בלבד:
{
  "item": "שם הפריט שנבחר",
  "row": <מספר השורה>,
  "nameColumn": <מספר העמודה לכתוב בה את השם>,
  "reason": "הסבר קצר למה בחרת פריט זה"
}

אם הגיליון לא נראה כגיליון הרשמה, או שאין פריטים פנויים, החזר: {"item": null}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    const result = JSON.parse(raw);

    if (!result.item) return null;

    // Write the signer's name to the sheet
    await writeToSheet(spreadsheetId, result.row, result.nameColumn, signerName);

    return { item: result.item, reason: result.reason, url };
  } catch (err) {
    console.error('Sheets error:', err.message);
    return null;
  }
}

module.exports = { pickAndSignUp };
