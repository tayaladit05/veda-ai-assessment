import dotenv from 'dotenv';

dotenv.config();

export const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
};

export function getRedisConnectionOptions() {
  return {
    host: redisConfig.host,
    port: redisConfig.port,
    maxRetriesPerRequest: null,
  };
}
