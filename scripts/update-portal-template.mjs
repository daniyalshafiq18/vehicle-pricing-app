/**
 * Post-build script: updates SPA-Shell template with new hashed asset filenames
 * AND cleans up orphaned web-file directories + manifest records from prior builds.
 *
 * After `vite build` produces hashed files like:
 *   dist/assets/index-abc123.js
 *   dist/assets/style-xyz789.css
 *
 * This script:
 *   1. Patches the SPA-Shell HTML template to reference the new hashes
 *   2. Removes orphaned web-file directories from prior builds (not in dist/assets/)
 *   3. Marks orphaned records as IsDeleted: true in the portal manifest
 *
 * Usage: node scripts/update-portal-template.mjs
 */

import { readFileSync, writeFileSync, readdirSync, rmSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DIST_ASSETS = resolve(ROOT, 'dist', 'assets');
const WEB_FILES = resolve(
  ROOT,
  'vehicle-pricing-intelligence-platform',
  '.powerpages-site',
  'web-files',
);
const MANIFEST = resolve(
  ROOT,
  'vehicle-pricing-intelligence-platform',
  '.powerpages-site',
  '.portalconfig',
  'orgdb947021.crm6.dynamics.com-manifest.yml',
);
const SPA_SHELL = resolve(
  ROOT,
  'vehicle-pricing-intelligence-platform',
  '.powerpages-site',
  'web-templates',
  'spa-shell',
  'SPA-Shell.webtemplate.source.html',
);
const shouldCleanPortalOrphans = process.env.CLEAN_PORTAL_ORPHANS === 'true';

// ─── Helpers ──────────────────────────────────────────────────────────

/** Find first file in dist/assets matching a regex pattern */
function findAsset(pattern) {
  const file = readdirSync(DIST_ASSETS).find((f) => f.match(pattern));
  if (!file) throw new Error(`Could not find asset matching ${pattern} in ${DIST_ASSETS}`);
  return file;
}

/** Get the set of current asset filenames in dist/assets (excluding .map files) */
function getCurrentAssets() {
  const files = readdirSync(DIST_ASSETS);
  return new Set(files.filter((f) => !f.endsWith('.map')));
}

/** Pattern for Vite hashed filenames — matches any built chunk with a hash */
const HASHED_FILE_RE = /^(index|style|usePricing|analyticsRepository|vendor|formatters|badge)[-][a-zA-Z0-9_-]+\.(js|css)$/;

/** Read .webfile.yml and extract the record ID */
function getRecordIdFromWebfile(dirPath) {
  try {
    const items = readdirSync(dirPath);
    const ymlFile = items.find((f) => f.endsWith('.webfile.yml'));
    if (!ymlFile) return null;
    const content = readFileSync(resolve(dirPath, ymlFile), 'utf-8');
    const match = content.match(/^id:\s*([a-f0-9-]+)$/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Mark all entries in the manifest with the given recordId as IsDeleted: true.
 * Also removes the associated DisplayName line so the record remains valid.
 */
function markManifestRecordDeleted(manifest, recordId) {
  // Match a block of 5 lines starting with "- RecordId: <id>"
  const blockRe = new RegExp(
    `(  - RecordId: ${recordId}\\n)(  DisplayName: [^\\n]+\\n)(  CheckSum: [^\\n]+\\n)  IsDeleted: (true|false)\\n`,
    'g',
  );
  let count = 0;
  manifest = manifest.replace(blockRe, (match) => {
    count++;
    return match.replace('IsDeleted: false', 'IsDeleted: true').replace('IsDeleted: true', 'IsDeleted: true');
  });
  return { manifest, count };
}

// ══════════════════════════════════════════════════════════════════════
// STEP 1 — Update SPA-Shell template references
// ══════════════════════════════════════════════════════════════════════

const jsFile = findAsset(/^index-[^.]+\.js$/);
const cssFile = findAsset(/^style-[^.]+\.css$/);

const template = readFileSync(SPA_SHELL, 'utf-8');

const updated = template
  .replace(/href="\/assets\/[^"]*\.css"/, `href="/assets/${cssFile}"`)
  .replace(/src="\/assets\/[^"]*\.js"/, `src="/assets/${jsFile}"`);

if (template === updated) {
  console.warn('⚠️  No changes — template references already match');
} else {
  writeFileSync(SPA_SHELL, updated, 'utf-8');
  console.log(`✅ SPA-Shell template updated:`);
  console.log(`   CSS → /assets/${cssFile}`);
  console.log(`   JS  → /assets/${jsFile}`);
}

// ══════════════════════════════════════════════════════════════════════
// STEP 2 — Clean up orphaned web-file directories & manifest records
// ══════════════════════════════════════════════════════════════════════

if (!shouldCleanPortalOrphans) {
  console.log('\nSkipping orphaned web-file cleanup. Set CLEAN_PORTAL_ORPHANS=true to enable it.');
  process.exit(0);
}

console.log('\n🔍 Checking for orphaned web-file records...');

const currentAssets = getCurrentAssets();
const orphanedIds = [];
const orphanedDirs = [];

// Scan web-files directory for hashed assets not in dist/assets/ anymore
let webFilesScanned = 0;
let webFilesTotal = 0;
for (const entry of readdirSync(WEB_FILES, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  webFilesTotal++;
  const dirName = entry.name;

  // Only process files matching Vite hashed patterns
  if (!HASHED_FILE_RE.test(dirName)) continue;

  webFilesScanned++;

  // Skip if this file still exists in current dist/assets/
  if (currentAssets.has(dirName)) continue;

  // Orphan found — get its record ID and mark for deletion
  const dirPath = resolve(WEB_FILES, dirName);
  const recordId = getRecordIdFromWebfile(dirPath);
  if (recordId) {
    orphanedIds.push(recordId);
    orphanedDirs.push(dirPath);
    console.log(`   ╰ Orphan: ${dirName} (record ${recordId})`);
  } else {
    orphanedDirs.push(dirPath);
    console.log(`   ╰ Orphan: ${dirName} (no record ID found — deleting directory only)`);
  }
}

if (orphanedIds.length === 0 && orphanedDirs.length === 0) {
  console.log('   ✗ No orphaned files found — all assets are current.');
} else {
  // ── Update manifest ──
  if (orphanedIds.length > 0) {
    let manifestContent = readFileSync(MANIFEST, 'utf-8');
    let totalDeleted = 0;

    for (const id of orphanedIds) {
      const result = markManifestRecordDeleted(manifestContent, id);
      if (result.count > 0) {
        manifestContent = result.manifest;
        totalDeleted += result.count;
        console.log(`   ╰ Manifest: marked record ${id} as deleted (${result.count} occurrences)`);
      }
    }

    if (totalDeleted > 0) {
      writeFileSync(MANIFEST, manifestContent, 'utf-8');
      console.log(`   ✅ Manifest updated: ${totalDeleted} record(s) marked as deleted`);
    }
  }

  // ── Delete orphaned directories ──
  for (const dirPath of orphanedDirs) {
    rmSync(dirPath, { recursive: true, force: true });
    console.log(`   🗑️  Deleted: ${basename(dirPath)}`);
  }
}

console.log(`\n📊 Summary: scanned ${webFilesTotal} directories, checked ${webFilesScanned} hashed assets.`);
