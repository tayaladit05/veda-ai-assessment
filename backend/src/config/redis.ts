import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

export const redisConfig = {
  host: (process.env.REDIS_HOST && !process.env.REDIS_HOST.startsWith('redis')) ? process.env.REDIS_HOST : '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
};

export function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
  if (redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))) {
    try {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        maxRetriesPerRequest: null,
        // Enforce TLS settings if using rediss:// protocol (critical for managed cloud Redis on Render/AWS)
        tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
      };
    } catch (err) {
      console.error('[Redis Config] Failed to parse Redis connection string:', err);
    }
  }

  return {
    host: redisConfig.host,
    port: redisConfig.port,
    maxRetriesPerRequest: null,
  };
}
