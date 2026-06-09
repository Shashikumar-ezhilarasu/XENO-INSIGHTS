import cron from 'node-cron';
import { checkAndRunTriggers } from '../utils/triggerRunner';

/**
 * Initializes background CRON workers.
 */
export function initCron() {
  console.log('[Cron Service] Initializing hourly triggers background worker...');

  // Configure cron to execute triggers evaluation every hour: '0 * * * *'
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron Service] Scanning trigger rules...');
    const result = await checkAndRunTriggers();
    console.log(`[Cron Service] Triggers evaluation completed. Triggered campaigns for ${result.triggeredCount} users.`);
  });
}
