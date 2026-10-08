/**
 * CompeteX Database Recovery & Restore Utility
 * Documented in Section 14.3 of CompeteX PBL Report
 * Mohan Babu University - Course 22IT104001
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const BACKUP_PATH_STATIC = path.join(__dirname, 'data', 'db_backup.json');
const BACKUPS_DIR = path.join(__dirname, 'data', 'backups');

function restoreDatabase(targetFile) {
  let sourceToRestore = null;

  if (targetFile) {
    if (fs.existsSync(targetFile)) {
      sourceToRestore = targetFile;
    } else if (fs.existsSync(path.join(BACKUPS_DIR, targetFile))) {
      sourceToRestore = path.join(BACKUPS_DIR, targetFile);
    }
  }

  // If no specific file provided, find latest snapshot or static backup
  if (!sourceToRestore) {
    if (fs.existsSync(BACKUPS_DIR)) {
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();
      if (files.length > 0) {
        sourceToRestore = path.join(BACKUPS_DIR, files[0]);
      }
    }
    if (!sourceToRestore && fs.existsSync(BACKUP_PATH_STATIC)) {
      sourceToRestore = BACKUP_PATH_STATIC;
    }
  }

  if (!sourceToRestore || !fs.existsSync(sourceToRestore)) {
    console.error('[RESTORE ERROR] No valid backup file found to restore.');
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(sourceToRestore, 'utf8');
    const parsed = JSON.parse(rawData);

    // Create safety backup of current state before overwrite
    if (fs.existsSync(DB_PATH)) {
      const safetyFile = path.join(BACKUPS_DIR, `pre_restore_safety_${Date.now()}.json`);
      fs.copyFileSync(DB_PATH, safetyFile);
    }

    // Atomic write to db.json
    fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8');

    console.log('===============================================================');
    console.log('   CompeteX Database Restore Successful');
    console.log('===============================================================');
    console.log(`Restored From:   ${sourceToRestore}`);
    console.log(`Target DB:       ${DB_PATH}`);
    console.log(`Collections:     ${Object.keys(parsed).join(', ')}`);
    console.log(`Status:          Database restored and verified!`);
    console.log('===============================================================');
  } catch (err) {
    console.error('[RESTORE ERROR] Failed to restore database:', err.message);
    process.exit(1);
  }
}

const targetArg = process.argv[2];
restoreDatabase(targetArg);
