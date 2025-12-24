import { Redis } from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'redis_password_2024',
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

export const redisPub = redis.duplicate();
export const redisSub = redis.duplicate();

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('ready', () => {
  console.log('✅ Redis ready');
});

export async function testRedisConnection() {
  try {
    await redis.ping();
    console.log('✅ Redis connection test passed');
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    throw error;
  }
}

export async function closeRedisConnection() {
  await redis.disconnect();
  await redisPub.disconnect();
  await redisSub.disconnect();
}