const { Pool } = require('pg');

async function debugDatabase() {
  console.log('DEBUG: Starting database connection test...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('DEBUG: Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('DEBUG: Database connection successful');

    // Check current users table structure
    console.log('DEBUG: Checking users table structure...');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('DEBUG: Current users table columns:');
    tableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check if status column exists
    const statusColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'status'
    `);

    if (statusColumn.rows.length === 0) {
      console.log('DEBUG: Status column missing - attempting to add...');
      
      try {
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active'
        `);
        console.log('DEBUG: Successfully added status column');
        
        // Update existing users
        const updateResult = await pool.query(`
          UPDATE users SET status = 'active' WHERE status IS NULL OR status = ''
        `);
        console.log(`DEBUG: Updated ${updateResult.rowCount} users with active status`);
        
      } catch (error) {
        console.error('DEBUG: Error adding status column:', error.message);
      }
    } else {
      console.log('DEBUG: Status column already exists');
    }

    // Check if reset_token column exists
    const resetTokenColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'reset_token'
    `);

    if (resetTokenColumn.rows.length === 0) {
      console.log('DEBUG: Reset token column missing - attempting to add...');
      
      try {
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN reset_token VARCHAR(255)
        `);
        console.log('DEBUG: Successfully added reset_token column');
      } catch (error) {
        console.error('DEBUG: Error adding reset_token column:', error.message);
      }
    } else {
      console.log('DEBUG: Reset token column already exists');
    }

    // Check if reset_token_expiry column exists
    const resetTokenExpiryColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'reset_token_expiry'
    `);

    if (resetTokenExpiryColumn.rows.length === 0) {
      console.log('DEBUG: Reset token expiry column missing - attempting to add...');
      
      try {
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN reset_token_expiry TIMESTAMP
        `);
        console.log('DEBUG: Successfully added reset_token_expiry column');
      } catch (error) {
        console.error('DEBUG: Error adding reset_token_expiry column:', error.message);
      }
    } else {
      console.log('DEBUG: Reset token expiry column already exists');
    }

    // Final table structure check
    console.log('DEBUG: Final users table structure check...');
    const finalTableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('DEBUG: Final users table columns:');
    finalTableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

  } catch (error) {
    console.error('DEBUG: Database operation failed:', error);
  } finally {
    await pool.end();
    console.log('DEBUG: Database connection closed');
  }
}

if (require.main === module) {
  debugDatabase()
    .then(() => {
      console.log('DEBUG: Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('DEBUG: Script failed:', error);
      process.exit(1);
    });
}

module.exports = debugDatabase;
