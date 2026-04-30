// In-memory store for the day's accumulated actions
const daily = [];

function addAction(action, group, original) {
  daily.push({ action, group, original, addedAt: new Date() });
}

function flushActions() {
  const snapshot = [...daily];
  daily.length = 0;
  return snapshot;
}

function getActions() {
  return [...daily];
}

module.exports = { addAction, flushActions, getActions };
