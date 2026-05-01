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

A single message may contain MULTIPLE actionable items. For example, a teacher's message might include homework, something to bring, and an upcoming event — these are THREE separate items.

For EACH actionable item found, create a separate entry. Ignore pure social chat with no action required.

Return ONLY a valid JSON array, no other text:
[
  {
    "type": "event" | "task",
    "title": "short title in English",
    "date": "YYYY-MM-DD or null if unknown",
    "time": "HH:MM or null",
    "owner": "Or" | "Itay" | "both",
    "details": "brief English summary of just this specific item"
  }
]

Return an empty array [] if there is nothing actionable.

Item types:
- "event" = something that happens at a specific time: trip, performance, match, meeting, school event, holiday
- "task" = something to do or bring: homework, item to bring, form to sign, payment to make, preparation needed

Rules for dates:
- "ביום חמישי" / "Thursday" = next upcoming ${date < '2026-05-07' ? 'Thursday 2026-05-07' : 'Thursday'}
- "השבוע" / "this week" = null for date, mention in details
- "מחר" / "tomorrow" = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- "ביום ראשון" / "Sunday" = next upcoming Sunday
- Always resolve relative dates using today's date: ${date}

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
