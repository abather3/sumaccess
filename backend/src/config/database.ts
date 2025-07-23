import { Pool } from 'pg';
import { getSecureConfig } from './config';
import { connectSQLiteDatabase, initializeSQLiteDatabase, sqlitePool } from './database-sqlite';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/escashop';
const USE_SQLITE = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL;

// Database configuration based on environment
let pool: any;
let connectDatabase: () => Promise<any>;
let initializeDatabase: () => Promise<void>;

if (USE_SQLITE) {
  console.log('Using SQLite database for development');
  
  pool = sqlitePool;
  connectDatabase = connectSQLiteDatabase;
  initializeDatabase = initializeSQLiteDatabase;
} else {
  console.log('Using PostgreSQL database');
  
  const pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  });
  
  pool = pgPool;
  connectDatabase = async (): Promise<void> => {
    try {
      const client = await pgPool.connect();
      console.log('Database connection established');
      client.release();
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  };
  
  initializeDatabase = async (): Promise<void> => {
    try {
      console.log('Running PostgreSQL database initialization...');
      const fs = require('fs');
      const path = require('path');
      
      // Read the complete migration SQL file
      const migrationPath = path.join(__dirname, '../database/complete-migration.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Parse SQL statements handling dollar-quoted strings
      const statements: string[] = [];
      let currentStatement = '';
      let inDollarQuote = false;
      let dollarQuoteTag = '';
      
      const lines = migrationSQL.split('\n');
      
      for (let line of lines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('--') || line.trim() === '') {
          continue;
        }
        
        // Check for dollar quotes
        const dollarQuoteMatch = line.match(/\$([^$]*)\$/);
        if (dollarQuoteMatch) {
          if (!inDollarQuote) {
            inDollarQuote = true;
            dollarQuoteTag = dollarQuoteMatch[0];
          } else if (dollarQuoteMatch[0] === dollarQuoteTag) {
            inDollarQuote = false;
            dollarQuoteTag = '';
          }
        }
        
        currentStatement += line + '\n';
        
        // If we're not in a dollar quote and the line ends with semicolon, it's a statement end
        if (!inDollarQuote && line.trim().endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
      
      // Add any remaining statement
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      
      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          await pgPool.query(statement);
        }
      }
      
      console.log('PostgreSQL database initialized successfully');
    } catch (error) {
      console.error('Error initializing PostgreSQL database:', error);
      throw error;
    }
  };
}

export { pool, connectDatabase, initializeDatabase };

// Graceful shutdown - only handle explicit shutdown signals
let isShuttingDown = false;

const gracefulShutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('Closing database connection pool...');
  if (USE_SQLITE) {
    // SQLite doesn't have a pool.end() method
    console.log('Database connection pool closed');
    process.exit(0);
  } else {
    pool.end(() => {
      console.log('Database connection pool closed');
      process.exit(0);
    });
  }
};

// Only handle actual shutdown signals, not development reload signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGQUIT', gracefulShutdown);

// Handle Ctrl+C in production, but not in development with nodemon
if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', gracefulShutdown);
}

export default pool;
