const Anthropic = require('@anthropic-ai/sdk');
const { TODAY } = require('./config');

async function extractActions(messageText, groupName) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { date, dayOfWeek } = TODAY();

  const prompt = `You are an assistant for an Israeli family. Extract ALL actionable items from a WhatsApp group message.

Context:
- Today: ${date} (${dayOfWeek})
- Group: "${groupName}"
- Parents: Or (mom) and Itay (dad)
- Messages may be in Hebrew, English, or mixed

A single message may contain MULTIPLE actionable items. Extract each one separately.

Return ONLY a valid JSON array, no other text:
[
  {
    "type": "event" | "prep" | "task",
    "title": "short title in English",
    "date": "YYYY-MM-DD or null",
    "time": "HH:MM or null",
    "owner": "Or" | "Itay" | "both",
    "details": "brief English summary of just this specific item"
  }
]

Return [] if nothing is actionable.

--- Type definitions ---

"event" — something happening at a specific time that you attend:
  school trip, performance, sports match, parent meeting, holiday, class party
  → use the actual date and time of the event

"prep" — something physical to buy, make, bring, or prepare:
  bring scissors, buy a costume, prepare a dish, print a form, charge a device, complete homework
  → use the DATE it is needed by (we will schedule a reminder 3 days before automatically)
  → if no explicit date, use today's date: ${date}

"task" — something to do or action to take: sign a permission slip, make a payment, fill out a form, reply to the teacher
  → if the message mentions a due date, set it. If truly no due date mentioned, date should be null

--- Date rules ---
- "ביום חמישי" / "Thursday" = next upcoming Thursday from ${date}
- "ביום ראשון" / "Sunday" = next upcoming Sunday from ${date}
- "מחר" / "tomorrow" = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- "השבוע" / "this week" = null
- Always resolve relative dates using today: ${date}

Message:
${messageText}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Claude error:', err.message);
    return [];
  }
}

module.exports = { extractActions };
