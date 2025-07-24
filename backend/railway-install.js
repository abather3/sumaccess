#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('Starting Railway custom install process...');

try {
  // Use npm install instead of npm ci to avoid cache mount conflicts
  console.log('Installing dependencies with npm install...');
  execSync('npm install --production=false', { stdio: 'inherit' });
  
  console.log('Dependencies installed successfully!');
  
  // Build the application
  console.log('Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
