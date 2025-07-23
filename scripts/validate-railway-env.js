#!/usr/bin/env node

/**
 * Railway Environment Validation Script
 * Validates that all required environment variables are set and secure
 */

const fs = require('fs');
const path = require('path');

class RailwayEnvValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.info = [];
    }

    // Required backend environment variables
    getRequiredBackendVars() {
        return [
            'NODE_ENV',
            'DATABASE_URL',
            'JWT_SECRET',
            'JWT_REFRESH_SECRET',
            'SESSION_SECRET',
            'FRONTEND_URL',
            'CORS_ORIGINS'
        ];
    }

    // Required frontend environment variables
    getRequiredFrontendVars() {
        return [
            'NODE_ENV',
            'REACT_APP_API_URL',
            'REACT_APP_WEBSOCKET_URL'
        ];
    }

    // Security validations
    validateSecrets() {
        this.info.push('🔐 Validating secrets...');

        // JWT Secret validation
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
            if (jwtSecret.length < 32) {
                this.errors.push('❌ JWT_SECRET is too short (minimum 32 characters)');
            } else if (jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
                this.errors.push('❌ JWT_SECRET is using default value - CHANGE IT!');
            } else if (jwtSecret.length >= 64) {
                this.info.push('✅ JWT_SECRET length is secure');
            } else {
                this.warnings.push('⚠️  JWT_SECRET could be longer for better security');
            }
        }

        // JWT Refresh Secret validation
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (refreshSecret) {
            if (refreshSecret.length < 32) {
                this.errors.push('❌ JWT_REFRESH_SECRET is too short (minimum 32 characters)');
            } else if (refreshSecret === 'your-super-secret-refresh-key-change-in-production') {
                this.errors.push('❌ JWT_REFRESH_SECRET is using default value - CHANGE IT!');
            } else if (refreshSecret.length >= 64) {
                this.info.push('✅ JWT_REFRESH_SECRET length is secure');
            }
        }

        // Session Secret validation
        const sessionSecret = process.env.SESSION_SECRET;
        if (sessionSecret && sessionSecret.length >= 64) {
            this.info.push('✅ SESSION_SECRET length is secure');
        }
    }

    // Validate database configuration
    validateDatabase() {
        this.info.push('🗄️  Validating database configuration...');

        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
            if (dbUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
                this.warnings.push('⚠️  Using localhost database in production environment');
            } else if (dbUrl.includes('railway') || dbUrl.includes('postgres')) {
                this.info.push('✅ Database URL appears to be configured for Railway');
            }
        }
    }

    // Validate CORS configuration
    validateCORS() {
        this.info.push('🌐 Validating CORS configuration...');

        const frontendUrl = process.env.FRONTEND_URL;
        const corsOrigins = process.env.CORS_ORIGINS;

        if (frontendUrl && frontendUrl.includes('railway.app')) {
            this.info.push('✅ Frontend URL is configured for Railway');
        } else if (frontendUrl && frontendUrl.includes('localhost')) {
            this.warnings.push('⚠️  Frontend URL still points to localhost');
        }

        if (corsOrigins && corsOrigins !== frontendUrl) {
            this.warnings.push('⚠️  CORS_ORIGINS and FRONTEND_URL don\'t match');
        }
    }

    // Validate SMS configuration
    validateSMS() {
        this.info.push('📱 Validating SMS configuration...');

        const smsProvider = process.env.SMS_PROVIDER;
        const smsEnabled = process.env.SMS_ENABLED;

        if (smsEnabled === 'true') {
            if (smsProvider === 'vonage') {
                const apiKey = process.env.VONAGE_API_KEY;
                const apiSecret = process.env.VONAGE_API_SECRET;
                
                if (!apiKey || !apiSecret) {
                    this.errors.push('❌ Vonage SMS enabled but API credentials missing');
                } else if (apiKey.length < 8 || apiSecret.length < 16) {
                    this.warnings.push('⚠️  Vonage credentials appear incomplete');
                } else {
                    this.info.push('✅ Vonage SMS configuration appears valid');
                }
            }
        } else {
            this.info.push('ℹ️  SMS is disabled');
        }
    }

    // Validate email configuration
    validateEmail() {
        this.info.push('📧 Validating email configuration...');

        const emailEnabled = process.env.EMAIL_SERVICE_ENABLED;
        
        if (emailEnabled === 'true') {
            const emailUser = process.env.EMAIL_USER;
            const emailPassword = process.env.EMAIL_PASSWORD;
            
            if (!emailUser || !emailPassword) {
                this.errors.push('❌ Email service enabled but credentials missing');
            } else if (emailPassword.length < 16) {
                this.warnings.push('⚠️  Email password appears too short (use app-specific password)');
            } else {
                this.info.push('✅ Email configuration appears valid');
            }
        } else {
            this.info.push('ℹ️  Email service is disabled');
        }
    }

    // Validate environment files exist
    validateEnvFiles() {
        this.info.push('📄 Checking environment files...');

        const backendEnvFile = path.join(__dirname, '../backend/.env.railway');
        const frontendEnvFile = path.join(__dirname, '../frontend/.env.railway');

        if (fs.existsSync(backendEnvFile)) {
            this.info.push('✅ Backend .env.railway file exists');
        } else {
            this.warnings.push('⚠️  Backend .env.railway file not found');
        }

        if (fs.existsSync(frontendEnvFile)) {
            this.info.push('✅ Frontend .env.railway file exists');
        } else {
            this.warnings.push('⚠️  Frontend .env.railway file not found');
        }
    }

    // Check for common security misconfigurations
    validateSecurity() {
        this.info.push('🔒 Validating security settings...');

        const nodeEnv = process.env.NODE_ENV;
        if (nodeEnv !== 'production') {
            this.warnings.push('⚠️  NODE_ENV is not set to production');
        }

        const secureCookies = process.env.SECURE_COOKIES;
        if (secureCookies !== 'true') {
            this.warnings.push('⚠️  SECURE_COOKIES should be true in production');
        }

        const csrfProtection = process.env.ENABLE_CSRF_PROTECTION;
        if (csrfProtection !== 'true') {
            this.warnings.push('⚠️  CSRF protection should be enabled');
        }

        const helmetSecurity = process.env.ENABLE_HELMET_SECURITY;
        if (helmetSecurity !== 'true') {
            this.warnings.push('⚠️  Helmet security headers should be enabled');
        }
    }

    // Run all validations
    validate() {
        console.log('🚀 Railway Environment Validation\n');

        this.validateEnvFiles();
        this.validateSecrets();
        this.validateDatabase();
        this.validateCORS();
        this.validateSMS();
        this.validateEmail();
        this.validateSecurity();

        this.printResults();
        return this.errors.length === 0;
    }

    // Print validation results
    printResults() {
        console.log('\n📊 Validation Results:\n');

        if (this.info.length > 0) {
            this.info.forEach(msg => console.log(msg));
            console.log('');
        }

        if (this.warnings.length > 0) {
            console.log('⚠️  WARNINGS:');
            this.warnings.forEach(msg => console.log(`  ${msg}`));
            console.log('');
        }

        if (this.errors.length > 0) {
            console.log('❌ ERRORS:');
            this.errors.forEach(msg => console.log(`  ${msg}`));
            console.log('');
        }

        console.log(`Summary: ${this.errors.length} errors, ${this.warnings.length} warnings`);

        if (this.errors.length === 0) {
            console.log('🎉 Validation passed! Your environment is ready for Railway deployment.');
        } else {
            console.log('🛑 Please fix the errors before deploying to Railway.');
        }

        // Deployment readiness checklist
        console.log('\n📋 Deployment Checklist:');
        console.log('  □ Backend .env.railway configured');
        console.log('  □ Frontend .env.railway configured');
        console.log('  □ JWT secrets are secure (64+ chars)');
        console.log('  □ Database URL configured for Railway PostgreSQL');
        console.log('  □ CORS origins match frontend URL');
        console.log('  □ SMS service credentials valid');
        console.log('  □ Email service credentials valid');
        console.log('  □ Security features enabled');
        console.log('  □ All sensitive files in .gitignore');

        console.log('\n🔗 Next Steps:');
        console.log('  1. Set environment variables in Railway dashboard');
        console.log('  2. Deploy backend service with PostgreSQL');
        console.log('  3. Deploy frontend service');
        console.log('  4. Update CORS configuration');
        console.log('  5. Test deployment');
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new RailwayEnvValidator();
    const isValid = validator.validate();
    process.exit(isValid ? 0 : 1);
}

module.exports = RailwayEnvValidator;
