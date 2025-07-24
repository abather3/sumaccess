const { Pool } = require('pg');

async function fixUsersTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Connecting to database...');
    await pool.connect();
    console.log('Connected successfully');

    // Check if status column exists
    const checkStatusColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'status'
    `);

    if (checkStatusColumn.rows.length === 0) {
      console.log('Adding status column to users table...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL
      `);
      console.log('✓ Status column added');

      // Update existing users to have active status
      await pool.query(`
        UPDATE users 
        SET status = 'active' 
        WHERE status IS NULL
      `);
      console.log('✓ Updated existing users with active status');
    } else {
      console.log('Status column already exists');
    }

    // Check if reset_token column exists
    const checkResetTokenColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'reset_token'
    `);

    if (checkResetTokenColumn.rows.length === 0) {
      console.log('Adding reset_token column to users table...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN reset_token VARCHAR(255)
      `);
      console.log('✓ Reset token column added');
    } else {
      console.log('Reset token column already exists');
    }

    // Check if reset_token_expiry column exists
    const checkResetTokenExpiryColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'reset_token_expiry'
    `);

    if (checkResetTokenExpiryColumn.rows.length === 0) {
      console.log('Adding reset_token_expiry column to users table...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN reset_token_expiry TIMESTAMP
      `);
      console.log('✓ Reset token expiry column added');
    } else {
      console.log('Reset token expiry column already exists');
    }

    // Create index on reset_token if it doesn't exist
    try {
      await pool.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_reset_token 
        ON users(reset_token) 
        WHERE reset_token IS NOT NULL
      `);
      console.log('✓ Reset token index ensured');
    } catch (error) {
      if (error.code !== '42P07') { // Index already exists
        console.log('Index creation skipped or failed:', error.message);
      }
    }

    console.log('✅ Users table fix completed successfully');

  } catch (error) {
    console.error('❌ Failed to fix users table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixUsersTable()
  .then(() => {
    console.log('Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });
