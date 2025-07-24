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
          ['business_name', 'EscaShop', 'Business name displayed on receipts', 'business', 'string'],
          ['business_address', '123 Main Street, City, Country', 'Business address for receipts', 'business', 'string'],
          ['business_phone', '+1234567890', 'Business contact phone', 'business', 'string'],
          ['receipt_footer', 'Thank you for your business!', 'Footer text on receipts', 'receipt', 'string'],
          ['currency_symbol', '₱', 'Currency symbol to display', 'business', 'string'],
          ['tax_rate', '0.12', 'Tax rate (12% = 0.12)', 'business', 'string'],
          ['queue_enabled', 'true', 'Enable queue management system', 'features', 'boolean']
        ];

        for (const [key, value, description, category, data_type] of defaultSettings) {
          await client.query(`
            INSERT INTO system_settings (key, value, description, category, data_type)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (key) DO NOTHING
          `, [key, value, description, category, data_type]);
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
