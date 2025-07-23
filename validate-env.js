#!/usr/bin/env node

console.log('=== Environment Variable Validation ===\n');

// Check React App environment variables
const requiredReactVars = [
  'REACT_APP_API_URL',
  'REACT_APP_SOCKET_URL'
];

const optionalReactVars = [
  'NODE_ENV',
  'CI',
  'GENERATE_SOURCEMAP',
  'DISABLE_ESLINT_PLUGIN',
  'TSC_COMPILE_ON_ERROR'
];

console.log('🔍 Required React Environment Variables:');
console.log('========================================');

let missingRequired = [];
for (const varName of requiredReactVars) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName} = "${value}"`);
  } else {
    console.log(`❌ ${varName} = MISSING`);
    missingRequired.push(varName);
  }
}

console.log('\n🔧 Optional React Environment Variables:');
console.log('=======================================');

for (const varName of optionalReactVars) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName} = "${value}"`);
  } else {
    console.log(`⚠️  ${varName} = NOT SET (using defaults)`);
  }
}

console.log('\n📋 All Process Environment Variables:');
console.log('===================================');
Object.keys(process.env)
  .filter(key => key.startsWith('REACT_APP_') || key.startsWith('NODE_') || ['CI', 'GENERATE_SOURCEMAP', 'DISABLE_ESLINT_PLUGIN', 'TSC_COMPILE_ON_ERROR'].includes(key))
  .sort()
  .forEach(key => {
    console.log(`${key} = "${process.env[key]}"`);
  });

console.log('\n=== Validation Summary ===');
if (missingRequired.length > 0) {
  console.log(`❌ VALIDATION FAILED: Missing ${missingRequired.length} required variable(s):`);
  missingRequired.forEach(varName => console.log(`   - ${varName}`));
  process.exit(1);
} else {
  console.log('✅ VALIDATION PASSED: All required environment variables are set');
  process.exit(0);
}
