import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../models/drizzle/schema';

const pool = new Pool({
  connectionString: process.env.DB_URL || 'postgresql://billing_user:billing_password_2024@localhost:5432/billing_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

export async function testConnection(): Promise<void> {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function closeConnection(): Promise<void> {
  await pool.end();
}