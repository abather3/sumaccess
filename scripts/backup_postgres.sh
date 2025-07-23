#!/bin/bash

# PostgreSQL Backup Script for EscaShop
# This script creates automated backups of the PostgreSQL database
# Usage: ./backup_postgres.sh [environment]
# Environment: development, production, or staging (default: production)

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/escashop_backup.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "Starting PostgreSQL backup for environment: $ENVIRONMENT"

# Environment-specific configuration
case $ENVIRONMENT in
    "development")
        DB_NAME="escashop_dev"
        DB_USER="postgres"
        DB_HOST="localhost"
        DB_PORT="5432"
        BACKUP_RETENTION_DAYS=3
        ;;
    "staging")
        DB_NAME="escashop_staging"
        DB_USER="postgres"
        DB_HOST="localhost"
        DB_PORT="5432"
        BACKUP_RETENTION_DAYS=5
        ;;
    "production")
        DB_NAME="escashop"
        DB_USER="postgres"
        DB_HOST="localhost"
        DB_PORT="5432"
        BACKUP_RETENTION_DAYS=30
        ;;
    *)
        log_message "ERROR: Unknown environment '$ENVIRONMENT'. Use: development, staging, or production"
        exit 1
        ;;
esac

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    log_message "ERROR: pg_dump command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Backup filename
BACKUP_FILE="$BACKUP_DIR/escashop_${ENVIRONMENT}_backup_$DATE.sql.gz"

# Check if database is accessible
log_message "Testing database connection..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" &> /dev/null; then
    log_message "ERROR: Cannot connect to PostgreSQL database at $DB_HOST:$DB_PORT"
    exit 1
fi

log_message "Database connection successful"

# Create the backup
log_message "Creating backup: $BACKUP_FILE"
PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_message "Backup completed successfully: $BACKUP_FILE (Size: $BACKUP_SIZE)"
else
    log_message "ERROR: Backup failed"
    exit 1
fi

# Verify backup integrity
log_message "Verifying backup integrity..."
if gzip -t "$BACKUP_FILE"; then
    log_message "Backup integrity verified successfully"
else
    log_message "ERROR: Backup integrity check failed"
    exit 1
fi

# Clean up old backups
log_message "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "escashop_${ENVIRONMENT}_backup_*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r old_backup; do
        log_message "Removing old backup: $old_backup"
        rm -f "$old_backup"
    done
else
    log_message "No old backups to clean up"
fi

# Generate backup report
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "escashop_${ENVIRONMENT}_backup_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log_message "=== Backup Summary ==="
log_message "Environment: $ENVIRONMENT"
log_message "Database: $DB_NAME"
log_message "Backup file: $BACKUP_FILE"
log_message "Backup size: $BACKUP_SIZE"
log_message "Total backups in directory: $TOTAL_BACKUPS"
log_message "Total backup directory size: $TOTAL_SIZE"
log_message "Retention policy: $BACKUP_RETENTION_DAYS days"
log_message "=== Backup Complete ==="

# Optional: Upload to cloud storage (uncomment and configure as needed)
# if [ "$ENVIRONMENT" = "production" ]; then
#     log_message "Uploading backup to cloud storage..."
#     aws s3 cp "$BACKUP_FILE" "s3://your-backup-bucket/postgres/$ENVIRONMENT/"
#     if [ $? -eq 0 ]; then
#         log_message "Cloud upload successful"
#     else
#         log_message "WARNING: Cloud upload failed"
#     fi
# fi

# Optional: Send notification email
# if command -v mail &> /dev/null; then
#     echo "PostgreSQL backup completed successfully for $ENVIRONMENT environment. Backup file: $BACKUP_FILE (Size: $BACKUP_SIZE)" | \
#         mail -s "EscaShop Database Backup - $ENVIRONMENT - $(date)" admin@yourdomain.com
# fi

exit 0
