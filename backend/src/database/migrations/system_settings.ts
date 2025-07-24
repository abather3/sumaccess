import { pool } from '../../config/database';

export async function runSystemSettingsMigration(): Promise<void> {
  try {
    console.log('Running system settings migration...');
    
    // Check if the table exists and what columns it has
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'system_settings'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      // Create system_settings table with full schema matching complete-migration.sql
      await pool.query(`
        CREATE TABLE system_settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          category VARCHAR(100) NOT NULL,
          data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
          is_public BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created system_settings table with full schema');
    } else {
      console.log('system_settings table already exists, checking schema...');
      
      // Check if all required columns exist
      const requiredColumns = ['key', 'description', 'category', 'data_type', 'is_public'];
      for (const column of requiredColumns) {
        const columnExists = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'system_settings' AND column_name = $1
        `, [column]);
        
        if (columnExists.rows.length === 0) {
          console.log(`Adding missing ${column} column to system_settings table...`);
          switch (column) {
            case 'key':
              // Add key column without NOT NULL first, then update and add constraint
              await pool.query(`ALTER TABLE system_settings ADD COLUMN key VARCHAR(255)`);
              // If there are existing rows, give them a default key
              await pool.query(`UPDATE system_settings SET key = 'setting_' || id WHERE key IS NULL`);
              // Now add the NOT NULL constraint
              await pool.query(`ALTER TABLE system_settings ALTER COLUMN key SET NOT NULL`);
              // Check if unique constraint already exists
              const constraintExists = await pool.query(`
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'system_settings' 
                AND constraint_type = 'UNIQUE' 
                AND constraint_name LIKE '%key%'
              `);
              if (constraintExists.rows.length === 0) {
                await pool.query(`ALTER TABLE system_settings ADD CONSTRAINT system_settings_key_unique UNIQUE (key)`);
              }
              break;
            case 'description':
              await pool.query(`ALTER TABLE system_settings ADD COLUMN description TEXT`);
              break;
            case 'category':
              await pool.query(`ALTER TABLE system_settings ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'general'`);
              break;
            case 'data_type':
              await pool.query(`ALTER TABLE system_settings ADD COLUMN data_type VARCHAR(20) NOT NULL DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json'))`);
              break;
            case 'is_public':
              await pool.query(`ALTER TABLE system_settings ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false`);
              break;
          }
        }
      }
    }

    // Create indexes for better performance (verify all columns exist first)
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'system_settings' 
      AND column_name IN ('key', 'category', 'data_type')
      ORDER BY column_name
    `);
    
    console.log('Found system_settings columns:', columnsCheck.rows.map(r => r.column_name));
    
    // Only create indexes if all required columns exist
    const foundColumns = columnsCheck.rows.map(r => r.column_name);
    const requiredIndexColumns = ['key', 'category', 'data_type'];
    const allColumnsExist = requiredIndexColumns.every(col => foundColumns.includes(col));
    
    if (allColumnsExist) {
      console.log('All required columns exist, creating indexes...');
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key)
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category)
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_system_settings_data_type ON system_settings(data_type)
      `);
      
      console.log('Created system_settings indexes successfully');
    } else {
      console.log('⚠️  Not all required columns exist for indexing. Missing:', 
        requiredIndexColumns.filter(col => !foundColumns.includes(col)));
      console.log('⚠️  Skipping index creation. Table schema may be incomplete.');
    }

    // Create trigger to update updated_at timestamp
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
      CREATE TRIGGER update_system_settings_updated_at
        BEFORE UPDATE ON system_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('System settings migration completed successfully');
  } catch (error) {
    console.error('System settings migration failed:', error);
    throw error;
  }
}
