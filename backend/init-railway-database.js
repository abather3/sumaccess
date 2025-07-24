const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Railway database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Initializing EscaShop Database for Railway...');
    console.log('====================================================');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // 1. Create users table
    console.log('📋 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'cashier',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Create customers table
    console.log('📋 Creating customers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        or_number VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        contact_number VARCHAR(20),
        email VARCHAR(255),
        age INTEGER,
        address TEXT,
        occupation VARCHAR(255),
        distribution_info VARCHAR(255),
        doctor_assigned VARCHAR(255),
        prescription JSONB,
        grade_type VARCHAR(100),
        lens_type VARCHAR(100),
        frame_code VARCHAR(100),
        estimated_time JSONB,
        payment_info JSONB,
        remarks TEXT,
        priority_flags JSONB DEFAULT '{}',
        token_number INTEGER,
        queue_status VARCHAR(50) DEFAULT 'waiting',
        queue_position INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 3. Create queue_analytics table
    console.log('📋 Creating queue_analytics table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS queue_analytics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        total_customers INTEGER DEFAULT 0,
        average_wait_time INTEGER DEFAULT 0,
        peak_hours JSONB DEFAULT '{}',
        completed_customers INTEGER DEFAULT 0,
        cancelled_customers INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date)
      );
    `);
    
    // 4. Create transactions table
    console.log('📋 Creating transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        transaction_status VARCHAR(50) DEFAULT 'pending',
        payment_details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 5. Create system_settings table (if not exists)
    console.log('📋 Creating/updating system_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 6. Insert default system settings
    console.log('📋 Inserting default system settings...');
    const settings = [
      ['queue_reset_time', '00:00', 'Daily queue reset time'],
      ['average_service_time', '15', 'Average service time in minutes'],
      ['max_queue_size', '200', 'Maximum queue size'],
      ['business_hours_start', '08:00', 'Business opening time'],
      ['business_hours_end', '17:00', 'Business closing time'],
      ['sms_enabled', 'true', 'Enable SMS notifications'],
      ['email_enabled', 'true', 'Enable email notifications']
    ];
    
    for (const [key, value, description] of settings) {
      await client.query(`
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key) DO UPDATE SET
          setting_value = $2,
          description = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [key, value, description]);
    }
    
    // 7. Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminResult = await client.query(`
      INSERT INTO users (email, full_name, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $3,
        role = $4,
        status = $5,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, full_name, role;
    `, [
      'admin@escashop.com',
      'System Administrator',
      hashedPassword,
      'admin',
      'active'
    ]);
    
    // 8. Create sample cashier user
    console.log('👤 Creating sample cashier user...');
    const cashierPassword = await bcrypt.hash('cashier123', 12);
    
    await client.query(`
      INSERT INTO users (email, full_name, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $3,
        role = $4,
        status = $5,
        updated_at = CURRENT_TIMESTAMP
    `, [
      'cashier@escashop.com',
      'Cashier User',
      cashierPassword,
      'cashier',
      'active'
    ]);
    
    // 9. Create indexes for performance
    console.log('📊 Creating database indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_customers_token_number ON customers(token_number);',
      'CREATE INDEX IF NOT EXISTS idx_customers_queue_status ON customers(queue_status);',
      'CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_queue_analytics_date ON queue_analytics(date);'
    ];
    
    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Database initialization completed successfully!');
    console.log('');
    console.log('🎉 Setup Summary:');
    console.log('================');
    console.log('📊 Tables created: users, customers, transactions, queue_analytics, system_settings');
    console.log('📈 Indexes created for performance optimization');
    console.log('⚙️  Default system settings configured');
    console.log('');
    console.log('👥 User Accounts Created:');
    console.log('-------------------------');
    console.log('🔐 Admin Login:');
    console.log('   📧 Email: admin@escashop.com');
    console.log('   🔑 Password: admin123');
    console.log('');
    console.log('🔐 Cashier Login:');
    console.log('   📧 Email: cashier@escashop.com');
    console.log('   🔑 Password: cashier123');
    console.log('');
    console.log('🚀 Your application is now ready!');
    console.log('   Frontend: https://escashop-frontend-production.up.railway.app');
    console.log('   Backend: https://escashop-backend-production.up.railway.app');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Connected to database successfully');
    console.log(`⏰ Current time: ${result.rows[0].current_time}`);
    console.log(`🗄️  Database: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Test admin login after creation
async function testAdminLogin() {
  try {
    console.log('🧪 Testing admin login...');
    const client = await pool.connect();
    
    const result = await client.query('SELECT * FROM users WHERE email = $1', ['admin@escashop.com']);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare('admin123', user.password_hash);
      
      if (isValidPassword) {
        console.log('✅ Admin login test: SUCCESS');
        console.log(`   👤 User ID: ${user.id}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🛡️  Role: ${user.role}`);
      } else {
        console.log('❌ Admin login test: Password verification failed');
      }
    } else {
      console.log('❌ Admin login test: User not found');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Admin login test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Railway Database Initialization');
  console.log('===================================');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not found');
    console.log('💡 This script should be run on Railway with DATABASE_URL set');
    process.exit(1);
  }
  
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  await initializeDatabase();
  await testAdminLogin();
  
  console.log('🎯 Next Steps:');
  console.log('==============');
  console.log('1. Your database is now fully initialized');
  console.log('2. You can login to your frontend application');
  console.log('3. All tables and users are ready to use');
  console.log('');
  console.log('Happy coding! 🚀');
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
