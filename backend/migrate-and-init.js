// Quick database setup script for Railway deployment
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function initializeDatabase() {
  console.log('🚀 Initializing Railway Database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');

    // Create users table
    console.log('📋 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier', 'manager')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create customers table
    console.log('📋 Creating customers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table
    console.log('📋 Creating transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        user_id INTEGER REFERENCES users(id),
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(20) DEFAULT 'cash',
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create system_settings table with schema matching existing migration
    console.log('📋 Creating system_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
        is_public BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create queue_analytics table
    console.log('📋 Creating queue_analytics table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS queue_analytics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        total_customers INTEGER DEFAULT 0,
        average_wait_time INTEGER DEFAULT 0,
        peak_hour INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if admin user exists
    const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    
    if (adminCheck.rows.length === 0) {
      console.log('👤 Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['admin', 'admin@escashop.com', hashedPassword, 'System Administrator', 'admin', true]);
      
      console.log('✅ Admin user created: admin@escashop.com / admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Insert default system settings
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
    
    // Create indexes for performance
    console.log('📈 Creating database indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
    
    console.log('✅ Database indexes created');
    
    client.release();
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Don't exit with error code - let the server start anyway
    // The server might still work with existing database structure
    console.log('⚠️  Continuing with server startup despite database initialization issues...');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
