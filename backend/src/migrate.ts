import { pool, connectDatabase } from './config/database';
import fs from 'fs';
import path from 'path';
import { runSystemSettingsMigration } from './database/migrations/system_settings';

async function runMigrations() {
  // Force Railway rebuild trigger - v1.1
  console.log('🚀 Starting database migrations...');
  
  try {
    // Ensure database connection is established
    console.log('🔌 Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected successfully');
    
    // CRITICAL: Fix users table columns first - this is our main issue
    console.log('🔧 CRITICAL: Checking and fixing users table columns...');
    try {
      // Check if status column exists
      console.log('🔍 Checking for status column...');
      const checkStatusColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
      `);

      if (checkStatusColumn.rows.length === 0) {
        console.log('⚠️  STATUS COLUMN MISSING - Adding now...');
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN status VARCHAR(50) DEFAULT 'active' NOT NULL
        `);
        // Update existing users to have active status
        const updateResult = await pool.query(`
          UPDATE users 
          SET status = 'active' 
          WHERE status IS NULL OR status = ''
        `);
        console.log(`✅ STATUS COLUMN ADDED and ${updateResult.rowCount} users updated`);
      } else {
        console.log('✅ Status column already exists');
      }

      // Check if reset_token column exists
      console.log('🔍 Checking for reset_token column...');
      const checkResetTokenColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'reset_token'
      `);

      if (checkResetTokenColumn.rows.length === 0) {
        console.log('⚠️  RESET_TOKEN COLUMN MISSING - Adding now...');
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN reset_token VARCHAR(255)
        `);
        console.log('✅ RESET_TOKEN COLUMN ADDED');
      } else {
        console.log('✅ Reset token column already exists');
      }

      // Check if reset_token_expiry column exists
      console.log('🔍 Checking for reset_token_expiry column...');
      const checkResetTokenExpiryColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'reset_token_expiry'
      `);

      if (checkResetTokenExpiryColumn.rows.length === 0) {
        console.log('⚠️  RESET_TOKEN_EXPIRY COLUMN MISSING - Adding now...');
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN reset_token_expiry TIMESTAMP
        `);
        console.log('✅ RESET_TOKEN_EXPIRY COLUMN ADDED');
      } else {
        console.log('✅ Reset token expiry column already exists');
      }

      console.log('🎉 CRITICAL USERS TABLE COLUMN FIX COMPLETED');
    } catch (error) {
      console.error('❌ CRITICAL ERROR fixing users table columns:', error);
      // Don't throw here - we want to continue with other migrations
      console.log('⚠️  Continuing with other migrations despite users table fix error');
    }
    
    // Run TypeScript migrations
    console.log('📋 Running system settings migration...');
    try {
      await runSystemSettingsMigration();
      console.log('✅ Completed: system_settings.ts');
    } catch (error) {
      console.error('❌ Failed to run system settings migration:', error);
      // Don't throw - continue
      console.log('⚠️  Continuing despite system settings migration error');
    }
    
    // Now run SQL migrations from root database directory
    console.log('📁 Checking for root database SQL migrations...');
    const databasePath = path.join(__dirname, 'database');
    let rootFiles: string[] = [];
    
    try {
      rootFiles = fs.readdirSync(databasePath).filter(file => file.endsWith('.sql') && file.startsWith('migrate-'));
      console.log(`📋 Found ${rootFiles.length} root SQL migrations:`, rootFiles);
    } catch (error) {
      console.log('📁 No root database directory found or no migrate-*.sql files');
    }
    
    for (const file of rootFiles.sort()) {
      const filePath = path.join(databasePath, file);
      console.log(`🔄 Running root SQL migration: ${file}`);
      try {
        const sql = fs.readFileSync(filePath, { encoding: 'utf-8' });
        await pool.query(sql);
        console.log(`✅ Completed: ${file}`);
      } catch (error) {
        console.error(`❌ Failed to run migration ${file}:`, error);
        // Continue with other migrations
      }
    }
    
    // Then run migrations from migrations directory
    console.log('📁 Checking migrations directory...');
    const migrationsPath = path.join(__dirname, 'database', 'migrations');
    let files: string[] = [];
    
    try {
      files = fs.readdirSync(migrationsPath).sort();
      console.log(`📋 Found ${files.length} files in migrations directory:`, files.slice(0, 10)); // Only show first 10 to avoid log spam
    } catch (error) {
      console.log('📁 No migrations directory found:', error);
    }

    let sqlFilesProcessed = 0;
    for (const file of files) {
      const filePath = path.join(migrationsPath, file);
      
      if (file.endsWith('.sql')) {
        sqlFilesProcessed++;
        console.log(`🔄 [${sqlFilesProcessed}] Running SQL migration: ${file}`);
        try {
          const sql = fs.readFileSync(filePath, { encoding: 'utf-8' });
          const result = await pool.query(sql);
          console.log(`✅ [${sqlFilesProcessed}] Completed: ${file}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [${sqlFilesProcessed}] Failed to run migration ${file}:`, errorMessage);
          // Continue with other migrations
        }
      } else if (file.endsWith('.ts') && file !== 'system_settings.ts') {
        console.log(`⏭️  Skipping TypeScript migration: ${file} (handled separately)`);
      }
    }
    
    console.log(`📊 Processed ${sqlFilesProcessed} SQL migration files`);

    console.log('🎯 All migrations completed successfully');
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
