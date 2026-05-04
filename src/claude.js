const Anthropic = require('@anthropic-ai/sdk');
const { TODAY } = require('./config');

async function extractActions(messageText, groupName, childInfo = null) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { date, dayOfWeek } = TODAY();

  const childContext = childInfo
    ? `- הילד/ה: ${childInfo.child} (${childInfo.grade}, גיל ${childInfo.age}) — ציין את שם הילד בכותרת ובפרטים`
    : '- הילד: לא ידוע — אם ניתן לזהות מההקשר, ציין';

  const prompt = `אתה עוזר למשפחה ישראלית. חלץ את כל הפריטים הניתנים לפעולה מהודעת WhatsApp.

הקשר:
- היום: ${date} (${dayOfWeek})
- קבוצה: "${groupName}"
- הורים: אור (אמא) ואיתי (אבא)
${childContext}
- הודעות עשויות להיות בעברית, אנגלית, או מעורבות

החזר ONLY מערך JSON תקין, ללא טקסט נוסף:
[
  {
    "type": "event" | "buy" | "prepare" | "task" | "update" | "cancel",
    "title": "כותרת ספציפית בעברית — כלול: שם הילד + מה + לאיזה אירוע + מיקום אם רלוונטי. לדוגמה: 'כרמי: לקנות ציוד לאירוע עששיות - חורשת אבנר' או 'ארז: לתרגל מילים להכתבה ביום ראשון'",
    "date": "YYYY-MM-DD or null",
    "reminder_date": "YYYY-MM-DD or null — see rules below",
    "time": "HH:MM or null",
    "end_time": "HH:MM or null — שעת סיום אם מפורשת בהודעה (למשל '8:00 עד 16:00' → end_time: '16:00'). אחרת null.",
    "owner": "Or" | "Itay" | "both",
    "details": "תיאור קצר בעברית. אם יש קישור רלוונטי בהודעה, כלול אותו כאן.",
    "url": "URL אם קיים בהודעה ורלוונטי לפריט זה, אחרת null"
  }
]

החזר [] אם אין דבר הניתן לפעולה.

--- הגדרות סוגים ---

"event" — משהו שקורה בזמן ספציפי שמשתתפים בו:
  טיול, הופעה, משחק, פגישת הורים, חג, חגיגת כיתה, הכתבה/מבחן
  → date = תאריך האירוע, time = שעה אם ידועה
  → reminder_date = null

"buy" — פריט פיזי שצריך לקנות ו/או להביא:
  להביא מספריים, לקנות תחפושת, להביא אוכל, להביא צנצנת, ציוד
  → date = התאריך שבו הפריט נדרש
  → reminder_date = כמה ימים לפני date לקנות: בדרך כלל 2-3 ימים לפני. אסור להיות בעבר (היום: ${date})

"prepare" — הכנה מנטלית או פעילות בבית, ללא רכישה פיזית:
  לתרגל מילים לאיות, לעשות שיעורי בית, לחזור על חומר, ללמוד
  → date = התאריך שעד אליו צריך להיות מוכן
  → reminder_date = יום לפני date בדרך כלל (תרגול = יום לפני, שיעורי בית = יומיים לפני)
  → אין צורך להביא כלום ביום האירוע — רק ההכנה חשובה

"task" — פעולה לביצוע, ללא נוכחות פיזית:
  לחתום על טופס, לשלם, למלא שאלון, להשיב למורה, להירשם לאירוע
  → date = תאריך היעד לביצוע המשימה. אם יש דדליין מפורש — השתמש בו. אם ההודעה מבקשת פעולה מיידית (כמו הרשמה, אישור השתתפות) — השתמש ב-${date} (היום). אחרת null.
  → reminder_date = null

"update" — message changes details of a previously announced event:
  time changed, venue changed, new items to bring, additional info
  → title = short description of what changed
  → details = the full change in Hebrew
  → include "search_keywords" field: 2-3 Hebrew keywords to find the original event (e.g. "עששיות חורשת אבנר")
  → include "changes" object: { "time": "HH:MM or null", "date": "YYYY-MM-DD or null", "details": "what changed" }

"cancel" — event or activity is cancelled
  → title = what was cancelled
  → include "search_keywords" field: 2-3 Hebrew keywords to find the original event

--- כללי תאריך ---
- "ביום ראשון" = ראשון הקרוב מ-${date}
- "ביום שני" = שני הקרוב מ-${date}
- "ביום חמישי" = חמישי הקרוב מ-${date}
- "מחר" = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- reminder_date לעולם לא יהיה בעבר. אם החישוב נותן תאריך עבר, השתמש ב-${date}

הודעה:
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

async function extractActionsFromImage(base64Image, caption, groupName, childInfo = null) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { date, dayOfWeek } = TODAY();

  const textPrompt = caption
    ? `תמונה עם כיתוב: "${caption}"\n\nקרא את התמונה וחלץ את כל הפריטים הניתנים לפעולה.`
    : 'קרא את התמונה וחלץ את כל הפריטים הניתנים לפעולה.';

  // Reuse the same system logic with an image content block
  const childContext = childInfo ? `הילד/ה: ${childInfo.child} (${childInfo.grade}, גיל ${childInfo.age}).` : '';
  const systemContext = `אתה עוזר למשפחה ישראלית. היום: ${date} (${dayOfWeek}). קבוצה: "${groupName}". הורים: אור ואיתי. ${childContext}

החזר ONLY מערך JSON תקין עם אותו פורמט כמו תמיד:
[{ "type": "event"|"buy"|"prepare"|"task", "title": "כותרת בעברית", "date": "YYYY-MM-DD or null", "reminder_date": "YYYY-MM-DD or null", "time": "HH:MM or null", "end_time": "HH:MM or null", "owner": "Or"|"Itay"|"both", "details": "תיאור בעברית", "url": null }]

החזר [] אם אין דבר הניתן לפעולה. אותם כללי סוגים כמו תמיד.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
          { type: 'text', text: `${systemContext}\n\n${textPrompt}` },
        ],
      }],
    });

    const raw = response.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Claude vision error:', err.message);
    return [];
  }
}

module.exports = { extractActions, extractActionsFromImage };
