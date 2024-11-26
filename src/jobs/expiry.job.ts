import cron from 'node-cron';
import { markExpiredResources } from '../controllers/resource.controller';

export const setupExpiryJob = () => {
    // Run every minute in development, every hour in production
    const schedule = process.env.NODE_ENV === 'production' ? '0 * * * *' : '* * * * *';

    cron.schedule(schedule, async () => {
        console.log('Running expiry job...');
        await markExpiredResources();
    });
};
