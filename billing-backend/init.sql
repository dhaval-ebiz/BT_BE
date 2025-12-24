-- Initial database setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create additional schemas if needed
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS billing;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE billing_db TO billing_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO billing_user;
GRANT ALL PRIVILEGES ON SCHEMA audit TO billing_user;
GRANT ALL PRIVILEGES ON SCHEMA billing TO billing_user;

-- Set timezone
SET timezone = 'UTC';