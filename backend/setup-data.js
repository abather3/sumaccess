// Post-migration data setup script
const { Pool } = require('pg');
const argon2 = require('argon2');

async function setupBasicData() {
  console.log('🔧 Setting up basic data after migrations...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');

    // Check if admin user exists
    const adminCheck = await client.query('SELECT id FROM users WHERE email = $1', ['admin@escashop.com']);
    
    if (adminCheck.rows.length === 0) {
      console.log('👤 Creating admin user...');
      const hashedPassword = await argon2.hash('admin123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MiB
        timeCost: 3,
        parallelism: 1
      });
      
      await client.query(`
        INSERT INTO users (email, full_name, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@escashop.com', 'System Administrator', hashedPassword, 'admin', 'active']);
      
      console.log('✅ Admin user created: admin@escashop.com / admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Insert default system settings (only if table exists and is empty)
    try {
      const settingsCount = await client.query('SELECT COUNT(*) FROM system_settings');
      
      if (settingsCount.rows[0].count === '0') {
        console.log('⚙️  Setting up default system settings...');
        const defaultSettings = [
          ['business_name', 'EscaShop'],
          ['business_address', '123 Main Street, City, Country'],
          ['business_phone', '+1234567890'],
          ['receipt_footer', 'Thank you for your business!'],
          ['currency_symbol', '₱'],
          ['tax_rate', '0.12'],
          ['queue_enabled', 'true']
        ];

        for (const [key, value] of defaultSettings) {
          await client.query(`
            INSERT INTO system_settings (key, value)
            VALUES ($1, $2)
            ON CONFLICT (key) DO NOTHING
          `, [key, value]);
        }

        console.log('✅ Default system settings configured');
      } else {
        console.log('ℹ️  System settings already exist');
      }
    } catch (settingsError) {
      console.log('⚠️  Could not set up system settings (table may not exist yet):', settingsError.message);
    }

    client.release();
    console.log('🎉 Basic data setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Basic data setup failed:', error.message);
    // Don't exit with error - let the server start anyway
    console.log('⚠️  Continuing with server startup despite data setup issues...');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupBasicData();
}

module.exports = { setupBasicData };
