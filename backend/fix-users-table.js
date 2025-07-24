// Emergency fix script to add missing status column to users table
const { Pool } = require('pg');

async function fixUsersTable() {
  console.log('🔧 Fixing users table schema...');
  console.log('🔧 DATABASE_URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');
  console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');

    // Check if status column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'status'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('⚠️  Status column missing, adding it...');
      
      // Add status column
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active'
      `);
      
      console.log('✅ Status column added successfully!');
    } else {
      console.log('ℹ️  Status column already exists');
    }

    // Check if reset_token columns exist
    const resetTokenCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('reset_token', 'reset_token_expiry')
    `);
    
    if (resetTokenCheck.rows.length < 2) {
      console.log('⚠️  Reset token columns missing, adding them...');
      
      // Add reset token columns if they don't exist
      const existingColumns = resetTokenCheck.rows.map(row => row.column_name);
      
      if (!existingColumns.includes('reset_token')) {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN reset_token VARCHAR(255)
        `);
        console.log('✅ reset_token column added');
      }
      
      if (!existingColumns.includes('reset_token_expiry')) {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN reset_token_expiry TIMESTAMP
        `);
        console.log('✅ reset_token_expiry column added');
      }
    } else {
      console.log('ℹ️  Reset token columns already exist');
    }

    // Show current table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current users table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}) ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

    client.release();
    console.log('🎉 Users table fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Users table fix failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  fixUsersTable();
}

module.exports = { fixUsersTable };
