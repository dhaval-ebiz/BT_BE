import type { Config } from 'drizzle-kit';

export default {
  schema: './src/models/drizzle/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DB_URL || 'postgresql://billing_user:billing_password_2024@localhost:5432/billing_db',
  },
  verbose: true,
  strict: true,
} satisfies Config;