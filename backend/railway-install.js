#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Railway custom build process...');
console.log('📁 Current working directory:', process.cwd());
console.log('📦 Node version:', process.version);

try {
  // Check if we're in the right directory (should have package.json)
  const fs = require('fs');
  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found in current directory');
  }
  
  console.log('✅ Found package.json, proceeding with build...');
  
  // Use npm install instead of npm ci to avoid cache mount conflicts
  console.log('📦 Installing dependencies with npm install...');
  execSync('npm install --production=false --no-audit --no-fund', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' } // Ensure dev deps are installed
  });
  
  console.log('✅ Dependencies installed successfully!');
  
  // Build the application
  console.log('🔨 Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('🎉 Build completed successfully!');
  
  // Verify build output exists
  if (fs.existsSync('dist')) {
    console.log('✅ Build output verified - dist directory exists');
  } else {
    console.log('⚠️  Warning: dist directory not found after build');
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.error('📍 Error occurred in:', process.cwd());
  console.error('🔍 Full error:', error);
  process.exit(1);
}
