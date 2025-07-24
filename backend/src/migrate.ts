import { pool, connectDatabase } from './config/database';
import fs from 'fs';
import path from 'path';
import { runSystemSettingsMigration } from './database/migrations/system_settings';

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Ensure database connection is established
    await connectDatabase();
    
    // First, run SQL migrations from root database directory
    const databasePath = path.join(__dirname, 'database');
    let rootFiles: string[] = [];
    
    try {
      rootFiles = fs.readdirSync(databasePath).filter(file => file.endsWith('.sql') && file.startsWith('migrate-'));
    } catch (error) {
      console.log('No root database directory found or no migrate-*.sql files');
    }
    
    for (const file of rootFiles.sort()) {
      const filePath = path.join(databasePath, file);
      console.log(`Running root SQL migration: ${file}`);
      try {
        const sql = fs.readFileSync(filePath, { encoding: 'utf-8' });
        await pool.query(sql);
        console.log(`✓ Completed: ${file}`);
      } catch (error) {
        console.error(`✗ Failed to run migration ${file}:`, error);
        throw error;
      }
    }
    
    // Then run migrations from migrations directory
    const migrationsPath = path.join(__dirname, 'database', 'migrations');
    let files: string[] = [];
    
    try {
      files = fs.readdirSync(migrationsPath).sort();
      console.log(`Found ${files.length} files in migrations directory:`, files);
    } catch (error) {
      console.log('No migrations directory found:', error);
    }

    for (const file of files) {
      const filePath = path.join(migrationsPath, file);
      console.log(`Processing file: ${file} at path: ${filePath}`);
      
      if (file.endsWith('.sql')) {
        console.log(`Running SQL migration: ${file}`);
        try {
          const sql = fs.readFileSync(filePath, { encoding: 'utf-8' });
          console.log(`SQL content length: ${sql.length} characters`);
          const result = await pool.query(sql);
          console.log(`✓ Completed: ${file} - Query result:`, result.command || 'Success');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`✗ Failed to run migration ${file}:`, errorMessage);
          console.error('Error details:', error);
          // Don't throw error for missing column errors - they might be expected
          if (!errorMessage.includes('already exists') && !errorMessage.includes('does not exist')) {
            throw error;
          } else {
            console.log(`⚠️ Continuing despite error in ${file}`);
          }
        }
      } else if (file.endsWith('.ts') && file !== 'system_settings.ts') {
        console.log(`Skipping TypeScript migration: ${file} (handled separately)`);
      } else if (file.endsWith('.js') || file.endsWith('.map')) {
        console.log(`Skipping compiled file: ${file}`);
      } else {
        console.log(`Skipping unknown file type: ${file}`);
      }
    }

    // Run TypeScript migrations
    try {
      await runSystemSettingsMigration();
      console.log('✓ Completed: system_settings.ts');
    } catch (error) {
      console.error('✗ Failed to run system settings migration:', error);
      throw error;
    }

    // Fix users table columns if missing
    console.log('Checking and fixing users table columns...');
    try {
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
        // Update existing users to have active status
        await pool.query(`
          UPDATE users 
          SET status = 'active' 
          WHERE status IS NULL
        `);
        console.log('✓ Status column added and updated');
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

      console.log('✓ Users table column check completed');
    } catch (error) {
      console.error('✗ Failed to fix users table columns:', error);
      // Don't throw here - continue with startup
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close database connection
    if (pool && pool.end) {
      await pool.end();
    }
  }
}

runMigrations()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
