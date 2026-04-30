const Anthropic = require('@anthropic-ai/sdk');
const { TODAY } = require('./config');

async function extractAction(messageText, groupName) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { date, dayOfWeek } = TODAY();

  const prompt = `You are an assistant for an Israeli family. Extract actionable items from WhatsApp group messages.

Context:
- Today: ${date} (${dayOfWeek})
- Group: "${groupName}"
- Parents: Or (mom) and Nir (dad)
- Messages may be in Hebrew, English, or mixed

Analyze this message and return a JSON object:
- If it contains a calendar event (meeting, trip, performance, match, deadline): type "event"
- If it contains a task/item to bring/prepare: type "task"
- If it's just chat with nothing actionable: type null

Return ONLY valid JSON, no other text:
{
  "type": "event" | "task" | null,
  "title": "short title in English",
  "date": "YYYY-MM-DD or null if unknown",
  "time": "HH:MM or null",
  "owner": "Or" | "Nir" | "both",
  "details": "brief English summary of the full context"
}

Rules for dates:
- "ביום חמישי" / "Thursday" = next upcoming Thursday from today
- "השבוע" / "this week" = use null for date, mention in details
- "מחר" / "tomorrow" = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- Always resolve relative dates using today's date above

Message:
${messageText}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Claude error:', err.message);
    return null;
  }
}

module.exports = { extractAction };
