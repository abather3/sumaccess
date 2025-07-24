-- Add missing status column and reset token columns to existing users table
-- This migration handles the case where users table exists but lacks these columns

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active';
        RAISE NOTICE 'Added status column to users table';
    ELSE
        RAISE NOTICE 'Status column already exists in users table';
    END IF;
END $$;

-- Add reset_token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'reset_token'
    ) THEN
        ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
        RAISE NOTICE 'Added reset_token column to users table';
    ELSE
        RAISE NOTICE 'Reset_token column already exists in users table';
    END IF;
END $$;

-- Add reset_token_expiry column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'reset_token_expiry'
    ) THEN
        ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP;
        RAISE NOTICE 'Added reset_token_expiry column to users table';
    ELSE
        RAISE NOTICE 'Reset_token_expiry column already exists in users table';
    END IF;
END $$;

-- Create index on reset_token if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Update existing users to have active status if they don't have one
DO $$
BEGIN
    IF EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        UPDATE users SET status = 'active' WHERE status IS NULL OR status = '';
        RAISE NOTICE 'Updated users with missing status to active';
    END IF;
END $$;
