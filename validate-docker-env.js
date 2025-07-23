#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Docker Environment Variable Validation ===\n');

// Check if running inside Docker
const isDocker = fs.existsSync('/.dockerenv');
console.log(`🐳 Running inside Docker: ${isDocker ? 'YES' : 'NO'}`);

// Required React environment variables
const requiredVars = {
  'REACT_APP_API_URL': 'API base URL for backend communication',
  'REACT_APP_SOCKET_URL': 'WebSocket URL for real-time communication'
};

// Optional environment variables
const optionalVars = {
  'NODE_ENV': 'Node environment (development/production)',
  'CI': 'Continuous Integration flag',
  'GENERATE_SOURCEMAP': 'Generate source maps for debugging',
  'DISABLE_ESLINT_PLUGIN': 'Disable ESLint plugin',
  'TSC_COMPILE_ON_ERROR': 'TypeScript compile on error'
};

console.log('\n🔍 Required Environment Variables:');
console.log('==================================');
let missingRequired = [];
let hasValidConfig = true;

for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName} = "${value}"`);
    console.log(`   📝 ${description}`);
    
    // Validate URL format
    if (varName.includes('URL') && !value.match(/^https?:\/\/.+/)) {
      console.log(`   ⚠️  Warning: Value doesn't appear to be a valid URL`);
      hasValidConfig = false;
    }
  } else {
    console.log(`❌ ${varName} = MISSING`);
    console.log(`   📝 ${description}`);
    missingRequired.push(varName);
    hasValidConfig = false;
  }
  console.log('');
}

console.log('🔧 Optional Environment Variables:');
console.log('==================================');
for (const [varName, description] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName} = "${value}"`);
  } else {
    console.log(`⚠️  ${varName} = NOT SET (using defaults)`);
  }
  console.log(`   📝 ${description}`);
  console.log('');
}

// Check build-time vs runtime availability
console.log('🏗️  Build-time vs Runtime Check:');
console.log('===============================');

// In a built React app, check if variables are embedded in the bundle
if (typeof window !== 'undefined' && window.location) {
  console.log('✅ Running in browser - environment variables should be embedded in build');
} else {
  console.log('🖥️  Running in Node.js environment');
  
  // Check if we're in a built React app's static files
  try {
    const buildPath = path.join(process.cwd(), 'build', 'static', 'js');
    if (fs.existsSync(buildPath)) {
      console.log('📦 Build directory found - checking if variables are embedded...');
      
      const jsFiles = fs.readdirSync(buildPath).filter(f => f.endsWith('.js'));
      let foundEmbedded = false;
      
      for (const file of jsFiles.slice(0, 3)) { // Check first 3 JS files
        const content = fs.readFileSync(path.join(buildPath, file), 'utf8');
        if (content.includes('REACT_APP_API_URL')) {
          foundEmbedded = true;
          break;
        }
      }
      
      if (foundEmbedded) {
        console.log('✅ Environment variables appear to be embedded in build');
      } else {
        console.log('❌ Environment variables may not be embedded in build');
        hasValidConfig = false;
      }
    }
  } catch (error) {
    console.log('⚠️  Could not check build files:', error.message);
  }
}

console.log('\n📊 Environment Summary:');
console.log('======================');
console.log(`Node.js Version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Working Directory: ${process.cwd()}`);
console.log(`Process ID: ${process.pid}`);

console.log('\n📋 All REACT_APP_ Variables:');
console.log('============================');
const reactAppVars = Object.keys(process.env)
  .filter(key => key.startsWith('REACT_APP_'))
  .sort();

if (reactAppVars.length === 0) {
  console.log('❌ No REACT_APP_ variables found!');
  hasValidConfig = false;
} else {
  reactAppVars.forEach(key => {
    console.log(`${key} = "${process.env[key]}"`);
  });
}

console.log('\n=== Validation Result ===');
if (missingRequired.length > 0) {
  console.log(`❌ VALIDATION FAILED: Missing ${missingRequired.length} required variable(s):`);
  missingRequired.forEach(varName => console.log(`   - ${varName}`));
  console.log('\n💡 To fix this:');
  console.log('1. Set build arguments in docker-compose.yml');
  console.log('2. Set environment variables in Dockerfile');
  console.log('3. Rebuild the Docker image');
  process.exit(1);
} else if (!hasValidConfig) {
  console.log('⚠️  VALIDATION PASSED WITH WARNINGS: Check the warnings above');
  process.exit(2);
} else {
  console.log('✅ VALIDATION PASSED: All required environment variables are properly configured');
  process.exit(0);
}
