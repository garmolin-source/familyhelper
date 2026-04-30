const cron = require('node-cron');
const { flushActions } = require('./store');
const { sendDailyDigest } = require('./email');

function startScheduler() {
  const digestTime = process.env.DIGEST_TIME || '18:00';
  const [hour, minute] = digestTime.split(':');

  // Run at configured time every day, Jerusalem timezone
  cron.schedule(`${minute} ${hour} * * *`, async () => {
    console.log(`[scheduler] Sending daily digest...`);
    const items = flushActions();
    if (items.length === 0) {
      console.log('[scheduler] Nothing to report today.');
      return;
    }
    await sendDailyDigest(items);
  }, { timezone: 'Asia/Jerusalem' });

  console.log(`Daily digest scheduled for ${digestTime} (Jerusalem time)`);
}

module.exports = { startScheduler };
