/**
 * CompeteX Database Backup Utility
 * Documented in Section 14.3 of CompeteX PBL Report
 * Mohan Babu University - Course 22IT104001
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const BACKUP_PATH_STATIC = path.join(__dirname, 'data', 'db_backup.json');
const BACKUPS_DIR = path.join(__dirname, 'data', 'backups');

function createBackup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('[BACKUP ERROR] Primary database not found at:', DB_PATH);
    process.exit(1);
  }

  // Ensure backups directory exists
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  try {
    const rawData = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(rawData);

    // Validate structure
    const collections = Object.keys(parsed);
    const totalRecords = collections.reduce((acc, k) => acc + (Array.isArray(parsed[k]) ? parsed[k].length : 1), 0);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    
    // 1. Static backup as specified in Section 14.3
    fs.writeFileSync(BACKUP_PATH_STATIC, rawData, 'utf8');

    // 2. Point-in-time timestamped backup
    const snapshotPath = path.join(BACKUPS_DIR, `db_backup_${timestampStr}.json`);
    fs.writeFileSync(snapshotPath, rawData, 'utf8');

    const stat = fs.statSync(snapshotPath);
    console.log('===============================================================');
    console.log('   CompeteX Database Backup Successful');
    console.log('===============================================================');
    console.log(`Source DB:       ${DB_PATH}`);
    console.log(`Primary Backup:  ${BACKUP_PATH_STATIC}`);
    console.log(`Snapshot File:   ${snapshotPath}`);
    console.log(`File Size:       ${(stat.size / 1024).toFixed(2)} KB`);
    console.log(`Collections:     ${collections.length} (${collections.join(', ')})`);
    console.log(`Total Records:   ${totalRecords}`);
    console.log(`Timestamp:       ${now.toISOString()}`);
    console.log('===============================================================');
  } catch (err) {
    console.error('[BACKUP ERROR] Failed to create backup:', err.message);
    process.exit(1);
  }
}

createBackup();
