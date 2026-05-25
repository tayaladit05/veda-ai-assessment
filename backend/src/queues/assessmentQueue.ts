import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';

// Define connection
const connectionOptions = getRedisConnectionOptions();

// Create BullMQ Queue for Assessment generation
export const assessmentQueue = new Queue('assessment-generation', {
  connection: connectionOptions,
});

console.log('BullMQ assessmentQueue initialized.');
