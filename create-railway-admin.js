const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Railway database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createRailwayAdmin() {
  try {
    console.log('🔐 Creating admin user for Railway deployment...');
    
    // First check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📋 Creating users table...');
      await pool.query(`
        CREATE TABLE users (
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
      console.log('✅ Users table created');
    }
    
    // Hash password using bcrypt (same as your auth system)
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Create/update admin user
    const query = `
      INSERT INTO users (email, full_name, password_hash, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $3,
        role = $4,
        status = $5,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, full_name, role, status;
    `;
    
    const values = [
      'admin@escashop.com',
      'System Administrator',
      hashedPassword,
      'admin',
      'active'
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length > 0) {
      console.log('✅ Admin user created/updated successfully');
      console.log('   📧 Email:', result.rows[0].email);
      console.log('   👤 Name:', result.rows[0].full_name);
      console.log('   🔐 Password: admin123');
      console.log('   🛡️  Role:', result.rows[0].role);
      console.log('   ✅ Status:', result.rows[0].status);
    }
    
    // Test login simulation
    console.log('\n🧪 Testing password verification...');
    const testUser = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@escashop.com']);
    
    if (testUser.rows.length > 0) {
      const isValid = await bcrypt.compare('admin123', testUser.rows[0].password_hash);
      console.log('🔍 Password verification:', isValid ? '✅ SUCCESS' : '❌ FAILED');
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Test database connection first
async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Railway Admin User Setup');
  console.log('============================');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not found');
    console.log('💡 Make sure to set DATABASE_URL in your Railway backend service');
    process.exit(1);
  }
  
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  await createRailwayAdmin();
  
  console.log('\n🎉 Setup complete!');
  console.log('📝 You can now login with:');
  console.log('   📧 Email: admin@escashop.com');
  console.log('   🔐 Password: admin123');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createRailwayAdmin };
