// Persistent store for created calendar events (survives restarts via Railway volume)
const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'auth_info', 'events.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function save(events) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(events, null, 2));
}

function storeEvent({ eventId, group, title, date, time }) {
  const events = load();
  events.push({ eventId, group, title, date, time, createdAt: new Date().toISOString() });
  save(events);
}

// Find the best matching event for an update/cancel message
function findBestMatch({ group, keywords, date }) {
  const events = load();
  const groupEvents = events.filter((e) => e.group === group);
  if (!groupEvents.length) return null;

  const kw = (keywords || '').toLowerCase().split(' ').filter(Boolean);

  // Score each event: keyword matches + date proximity
  const scored = groupEvents.map((e) => {
    const titleWords = e.title.toLowerCase();
    const keywordScore = kw.filter((k) => titleWords.includes(k)).length;

    let dateScore = 0;
    if (date && e.date) {
      const diff = Math.abs(new Date(date) - new Date(e.date)) / (1000 * 60 * 60 * 24);
      dateScore = diff <= 7 ? (7 - diff) : 0;
    }

    return { ...e, score: keywordScore * 3 + dateScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0] : null;
}

function removeEvent(eventId) {
  const events = load().filter((e) => e.eventId !== eventId);
  save(events);
}

module.exports = { storeEvent, findBestMatch, removeEvent };
