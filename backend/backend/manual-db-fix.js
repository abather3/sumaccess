// Manual database fix script - run this locally to fix Railway database
const { Pool } = require('pg');

async function manualDatabaseFix() {
  console.log('🔧 Manual database fix starting...');
  
  // Railway database connection string
  const DATABASE_URL = 'postgresql://postgres:tfTemdVNlTDUemnwSZbrHMkVaeeJsqgf@escashop-database-ynqq.railway.internal:5432/railway';
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Railway database successfully!');

    // First, check the current users table structure
    console.log('📋 Checking current users table structure...');
    const currentStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current users table columns:');
    currentStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}) ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

    // Check if status column exists
    const statusExists = currentStructure.rows.some(row => row.column_name === 'status');
    if (!statusExists) {
      console.log('⚠️  Status column missing, adding it...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active'
      `);
      console.log('✅ Status column added successfully!');
    } else {
      console.log('ℹ️  Status column already exists');
    }

    // Check if reset_token column exists
    const resetTokenExists = currentStructure.rows.some(row => row.column_name === 'reset_token');
    if (!resetTokenExists) {
      console.log('⚠️  Reset_token column missing, adding it...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN reset_token VARCHAR(255)
      `);
      console.log('✅ Reset_token column added successfully!');
    } else {
      console.log('ℹ️  Reset_token column already exists');
    }

    // Check if reset_token_expiry column exists
    const resetTokenExpiryExists = currentStructure.rows.some(row => row.column_name === 'reset_token_expiry');
    if (!resetTokenExpiryExists) {
      console.log('⚠️  Reset_token_expiry column missing, adding it...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN reset_token_expiry TIMESTAMP
      `);
      console.log('✅ Reset_token_expiry column added successfully!');
    } else {
      console.log('ℹ️  Reset_token_expiry column already exists');
    }

    // Show final table structure
    console.log('\n📋 Final users table structure:');
    const finalStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    finalStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}) ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

    // Test if we can now query the users table with status column
    console.log('\n🧪 Testing users table query with status column...');
    const testQuery = await client.query('SELECT id, email, status FROM users LIMIT 1');
    console.log('✅ Users table query successful!');
    if (testQuery.rows.length > 0) {
      console.log('Sample user:', testQuery.rows[0]);
    } else {
      console.log('No users found in table');
    }

    client.release();
    console.log('🎉 Manual database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Manual database fix failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

manualDatabaseFix();
