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
    console.log(`   Deleted: ${basename(dirPath)}`);
 *
 * Usage: node scripts/update-portal-template.mjs
 */

import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DIST_ASSETS = resolve(ROOT, 'dist', 'assets');
const PORTAL_ROOT = resolve(ROOT, 'vehicle-pricing-intelligence-platform');
const WEB_FILES = resolve(PORTAL_ROOT, 'web-files');
const MANIFEST = resolve(
  PORTAL_ROOT,
  '.portalconfig',
  'orgdb947021.crm6.dynamics.com-manifest.yml',
);
const BASE_MANIFEST = resolve(
  PORTAL_ROOT,
  '.portalconfig',
  'manifest.yml',
);
const SPA_SHELL = resolve(
  PORTAL_ROOT,
  'web-templates',
  'spa-shell',
  'SPA-Shell.webtemplate.source.html',
);
const DIST_INDEX = resolve(ROOT, 'dist', 'index.html');
const shouldCleanPortalOrphans = process.env.CLEAN_PORTAL_ORPHANS === 'true';

// Helpers

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

/** Read Vite asset tags from dist/index.html using Power Pages absolute URLs. */
function getViteAssetTags() {
  const distIndex = readFileSync(DIST_INDEX, 'utf-8');
  const tags = [...distIndex.matchAll(/<(?:script|link)\b[^>]+(?:><\/script>|>)/g)]
    .map((match) => match[0])
    .filter((tag) => tag.includes('./assets/'))
    .map((tag) => tag.replaceAll('./assets/', '/assets/'));

  if (tags.length === 0) {
    throw new Error(`Could not find Vite asset tags in ${DIST_INDEX}`);
  }

  return tags;
}

/** Pattern for Vite hashed filenames; matches any built chunk with a hash. */
const HASHED_FILE_RE = /^(index|style|usePricing|analyticsRepository|vendor|formatters|badge|charts|table|vendor-recharts)[-][a-zA-Z0-9_-]+\.(js|css)$/i;
const GENERATED_MANIFEST_FILE_RE =
  /^(index|style|usePricing|analyticsRepository|vendor|formatters|badge|charts|table|vendor-recharts)[-][a-zA-Z0-9_-]+\.(js|css)(\.map)?$/i;
const ASSETS_PARENT_PAGE_ID = 'f95ed4d7-0906-48fc-bcd4-2c1ef1fdf57a';
const PUBLISHING_STATE_ID = '3252f4b2-ce00-414a-a73d-de4a2a499641';

/** Read flat Enhanced-export .webfile.yml metadata and extract its record ID. */
function getRecordIdFromWebfile(fileName) {
  try {
    const content = readFileSync(resolve(WEB_FILES, `${fileName}.webfile.yml`), 'utf-8');
    const match = content.match(/^(?:adx_webfileid|id):\s*([a-f0-9-]+)$/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Read flat Enhanced-export .webfile.yml metadata used by PAC manifests. */
function getWebfileMetadata(fileName) {
  try {
    const content = readFileSync(resolve(WEB_FILES, `${fileName}.webfile.yml`), 'utf-8');
    const id = content.match(/^(?:adx_webfileid|id):\s*([a-f0-9-]+)$/m)?.[1];
    const annotationId = content.match(/^annotationid:\s*([a-f0-9-]+)$/m)?.[1];
    if (!id || !annotationId) return null;
    return { id, annotationId };
  } catch {
    return null;
  }
}

function getMimeType(fileName) {
  if (fileName.endsWith('.css')) return 'text/css';
  if (fileName.endsWith('.js')) return 'application/javascript';
  return 'application/octet-stream';
}

function createWebfileYml(fileName) {
  const id = randomUUID();
  const annotationId = randomUUID();

  return `adx_contentdisposition: 756150000
adx_enabletracking: false
adx_excludefromsearch: false
adx_hiddenfromsitemap: false
adx_name: ${fileName}
adx_parentpageid: ${ASSETS_PARENT_PAGE_ID}
adx_partialurl: ${fileName}
adx_publishingstateid: ${PUBLISHING_STATE_ID}
adx_webfileid: ${id}
annotationid: ${annotationId}
filename: ${fileName}
isdocument: true
mimetype: ${getMimeType(fileName)}
objectid: ${id}
objecttypecode: adx_webfile
`;
}

function getManifestEntityNames(manifest) {
  return [...manifest.matchAll(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/gm)].map((match) => match[1]);
}

function ensureBaseManifestEntitySections(manifest) {
  const orgManifest = readFileSync(MANIFEST, 'utf-8');
  const requiredEntities = getManifestEntityNames(orgManifest);
  let nextManifest = manifest;

  if (nextManifest.trim() === '{}' || nextManifest.trim() === '') {
    nextManifest = '';
  }

  for (const entityName of requiredEntities) {
    const entityRe = new RegExp(`^${entityName}:\\s*$`, 'm');
    if (!entityRe.test(nextManifest)) {
      nextManifest = `${nextManifest.trimEnd()}\n${entityName}: []\n`;
    }
  }

  for (const entityName of ['adx_webfile', 'adx_webtemplate', 'annotation']) {
    const entityRe = new RegExp(`^${entityName}:\\s*$`, 'm');
    const emptyEntityRe = new RegExp(`^${entityName}:\\s*\\[\\]\\s*$`, 'm');
    if (!entityRe.test(nextManifest) && !emptyEntityRe.test(nextManifest)) {
      nextManifest = `${nextManifest.trimEnd()}\n${entityName}: []\n`;
    }
  }

  return nextManifest.trimStart();
}

function normalizeEmptyManifestSections(manifest) {
  return manifest.replace(
    /^([A-Za-z_][A-Za-z0-9_]*):\s*\r?\n(?=^[A-Za-z_][A-Za-z0-9_]*:|\s*$)/gm,
    '$1: []\n',
  );
}

function getExistingWebFileName(fileName) {
  return readdirSync(WEB_FILES, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.endsWith('.webfile.yml'))
    .map((entry) => entry.name)
    .find((existingName) => existingName.toLowerCase() === fileName.toLowerCase());
}

/** Ensure every current dist asset has an exact flat Enhanced-export web file. */
function ensureCurrentWebFiles() {
  let created = 0;
  let refreshed = 0;

  for (const fileName of getCurrentAssets()) {
    if (!HASHED_FILE_RE.test(fileName)) continue;

    const sourcePath = resolve(DIST_ASSETS, fileName);
    const existingFileName = getExistingWebFileName(fileName);
    const hasCaseMismatch = !!existingFileName && existingFileName !== fileName;
    if (hasCaseMismatch) {
      rmSync(resolve(WEB_FILES, existingFileName), { force: true });
      rmSync(resolve(WEB_FILES, `${existingFileName}.webfile.yml`), { force: true });
    }

    const targetPath = resolve(WEB_FILES, fileName);
    const ymlPath = resolve(WEB_FILES, `${fileName}.webfile.yml`);

    if (!existsSync(ymlPath) || hasCaseMismatch) {
      writeFileSync(ymlPath, createWebfileYml(fileName), 'utf-8');
      created++;
    }

    copyFileSync(sourcePath, targetPath);
    refreshed++;
  }

  if (created > 0 || refreshed > 0) {
    console.log(`Web-files ensured: ${created} metadata file(s) created, ${refreshed} asset file(s) refreshed`);
  }
}

/** Read the current Vite web-file records from the Power Pages web-files folder. */
function getCurrentAssetRecords() {
  const currentAssets = getCurrentAssets();
  const records = [];

  for (const fileName of [...currentAssets].sort()) {
    if (!HASHED_FILE_RE.test(fileName)) continue;

    const metadata = getWebfileMetadata(fileName);
    if (!metadata) continue;

    records.push({ recordId: metadata.id, annotationId: metadata.annotationId, displayName: fileName });
  }

  return records;
}

/** Ensure PAC's base manifest includes current generated web-file records. */
function syncBaseManifestCurrentAssets() {
  const records = getCurrentAssetRecords();
  if (records.length === 0) return;

  let manifest = readFileSync(BASE_MANIFEST, 'utf-8');
  const manifestWithSections = ensureBaseManifestEntitySections(manifest);
  let changed = manifestWithSections !== manifest;
  manifest = normalizeEmptyManifestSections(manifestWithSections);
  changed = changed || manifest !== manifestWithSections;
  const missingWebfiles = [];
  const missingAnnotations = [];

  for (const { recordId, displayName } of records) {
    const recordRe = new RegExp(
      `(- RecordId: ${recordId}\\r?\\n  DisplayName: [^\\r\\n]+\\r?\\n  CheckSum: [^\\r\\n]*\\r?\\n  IsDeleted: )(true|false)`,
    );

    if (recordRe.test(manifest)) {
      manifest = manifest.replace(recordRe, `$1false`);
      continue;
    }

    missingWebfiles.push({ recordId, displayName });
  }

  for (const { annotationId, displayName } of records) {
    const recordRe = new RegExp(
      `(- RecordId: ${annotationId}\\r?\\n  DisplayName: [^\\r\\n]+\\r?\\n  CheckSum: [^\\r\\n]*\\r?\\n  IsDeleted: )(true|false)`,
    );

    if (recordRe.test(manifest)) {
      manifest = manifest.replace(recordRe, `$1false`);
      continue;
    }

    missingAnnotations.push({ recordId: annotationId, displayName });
  }

  if (missingWebfiles.length > 0) {
    const block = missingWebfiles
      .map(
        ({ recordId, displayName }) =>
          `- RecordId: ${recordId}\n  DisplayName: ${displayName}\n  CheckSum: \n  IsDeleted: false`,
      )
      .join('\n');
    if (/^adx_webfile:\s*\[\]\s*$/m.test(manifest)) {
      manifest = manifest.replace(/^adx_webfile:\s*\[\]\s*$/m, `adx_webfile:\n${block}`);
    } else if (/adx_webtemplate:\r?\n/.test(manifest)) {
      manifest = manifest.replace(/\r?\nadx_webtemplate:/, `\n${block}\nadx_webtemplate:`);
    } else if (/adx_webtemplate:\s*\[\]\s*/.test(manifest)) {
      manifest = manifest.replace(/\r?\nadx_webtemplate:\s*\[\]/, `\n${block}\nadx_webtemplate: []`);
    } else if (/annotation:\r?\n/.test(manifest)) {
      manifest = manifest.replace(/\r?\nannotation:/, `\n${block}\nannotation:`);
    } else if (/annotation:\s*\[\]\s*/.test(manifest)) {
      manifest = manifest.replace(/\r?\nannotation:\s*\[\]/, `\n${block}\nannotation: []`);
    } else {
      manifest = `adx_webfile:\n${block}\nadx_webtemplate: []\nannotation: []\n${manifest}`;
    }
    changed = true;
  }

  if (missingAnnotations.length > 0) {
    const block = missingAnnotations
      .map(
        ({ recordId, displayName }) =>
          `- RecordId: ${recordId}\n  DisplayName: ${displayName}\n  CheckSum: \n  IsDeleted: false`,
      )
      .join('\n');
    if (/^annotation:\s*\[\]\s*$/m.test(manifest)) {
      manifest = manifest.replace(/^annotation:\s*\[\]\s*$/m, `annotation:\n${block}`);
    } else if (/annotation:\r?\n/.test(manifest)) {
      manifest = manifest.replace(/annotation:\r?\n/, `annotation:\n${block}\n`);
    } else {
      manifest = `${manifest.trimEnd()}\nannotation:\n${block}\n`;
    }
    changed = true;
  }

  if (changed) {
    writeFileSync(BASE_MANIFEST, manifest, 'utf-8');
    console.log(
      `Base manifest synced: ${missingWebfiles.length} web-file record(s), ${missingAnnotations.length} annotation record(s) added`,
    );
  }
}

/** Mark stale generated asset records as deleted in PAC's base manifest. */
function markManifestStaleGeneratedAssets(manifestPath) {
  const currentAssets = getCurrentAssets();
  const currentRecordIds = new Map(
    getCurrentAssetRecords().flatMap(({ recordId, annotationId, displayName }) => [
      [recordId, displayName],
      [annotationId, displayName],
    ]),
  );
  let manifest = readFileSync(manifestPath, 'utf-8');
  let count = 0;
  const staleRecordIds = new Set();

  for (const match of manifest.matchAll(
    /- RecordId: ([^\r\n]+)\r?\n  DisplayName: ([^\r\n]+)\r?\n  CheckSum: [^\r\n]*\r?\n  IsDeleted: (true|false)/g,
  )) {
    const [, recordId, displayName] = match;
    if (!GENERATED_MANIFEST_FILE_RE.test(displayName)) continue;

    const isCurrentFile = currentAssets.has(displayName);
    const isCurrentRecord = currentRecordIds.get(recordId) === displayName;
    if (!isCurrentFile || !isCurrentRecord) {
      staleRecordIds.add(recordId);
    }
  }

  manifest = manifest.replace(
    /(- RecordId: ([^\r\n]+)\r?\n  DisplayName: ([^\r\n]+)\r?\n  CheckSum: [^\r\n]*\r?\n  IsDeleted: )false/g,
    (match, prefix, recordId, displayName) => {
      if (!GENERATED_MANIFEST_FILE_RE.test(displayName)) {
        return match;
      }

      const isCurrentFile = currentAssets.has(displayName);
      const isCurrentRecord = currentRecordIds.get(recordId) === displayName;

      if (isCurrentFile && isCurrentRecord) return match;
      if (!isCurrentFile || !isCurrentRecord) {
        count++;
        staleRecordIds.add(recordId);
        return `${prefix}true`;
      }

      count++;
      staleRecordIds.add(recordId);
      return `${prefix}true`;
    },
  );

  for (const recordId of staleRecordIds) {
    manifest = manifest.replace(
      new RegExp(`(- RecordId: ${recordId}\\r?\\n  DisplayName: [^\\r\\n]+\\r?\\n  CheckSum: [^\\r\\n]*\\r?\\n  IsDeleted: )false`, 'g'),
      (_match, prefix) => {
        count++;
        return `${prefix}true`;
      },
    );
  }

  if (count > 0) {
    writeFileSync(manifestPath, manifest, 'utf-8');
    console.log(`${basename(manifestPath)} cleanup: ${count} stale generated asset record(s) marked deleted`);
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
    return match
      .replace('IsDeleted: false', 'IsDeleted: true')
      .replace('IsDeleted: true', 'IsDeleted: true');
  });
  return { manifest, count };
}

// STEP 1: Update SPA-Shell template references

const template = readFileSync(SPA_SHELL, 'utf-8');
const viteAssetTags = getViteAssetTags();
const viteAssetLinks = viteAssetTags.filter((tag) => tag.startsWith('<link'));
const viteAssetScripts = viteAssetTags.filter((tag) => tag.startsWith('<script'));
const viteAssetBlock = [...viteAssetLinks, ...viteAssetScripts].join('\n');

const templateWithoutAssets = template
  .replace(/^\s*<link\b[^>]+href="\/assets\/[^"]+"[^>]*>\s*$/gm, '')
  .replace(/^\s*<script\b[^>]+src="\/assets\/[^"]+"[^>]*><\/script>\s*$/gm, '')
  .replace(/\n{3,}/g, '\n\n');

const updated = templateWithoutAssets.replace(
  '<div id="root"></div>',
  `${viteAssetLinks.join('\n')}\n<div id="root"></div>\n${viteAssetScripts.join('\n')}`,
);

if (template === updated) {
  console.warn('No changes: template references already match');
} else {
  writeFileSync(SPA_SHELL, updated, 'utf-8');
  console.log('SPA-Shell template updated:');
  console.log(viteAssetBlock.split('\n').map((tag) => `   ${tag}`).join('\n'));
}

// STEP 2: Clean up orphaned flat web files and manifest records

ensureCurrentWebFiles();
syncBaseManifestCurrentAssets();
markManifestStaleGeneratedAssets(BASE_MANIFEST);
markManifestStaleGeneratedAssets(MANIFEST);

if (!shouldCleanPortalOrphans) {
  console.log('\nSkipping orphaned web-file cleanup. Set CLEAN_PORTAL_ORPHANS=true to enable it.');
  process.exit(0);
}

console.log('\nChecking for orphaned web-file records...');

const currentAssets = getCurrentAssets();
const orphanedIds = [];
const orphanedFiles = [];

// Scan flat web-files export for hashed assets not in dist/assets/ anymore
let webFilesScanned = 0;
let webFilesTotal = 0;
for (const entry of readdirSync(WEB_FILES, { withFileTypes: true })) {
  if (!entry.isFile() || entry.name.endsWith('.webfile.yml')) continue;
  webFilesTotal++;
  const fileName = entry.name;

  // Only process files matching Vite hashed patterns
  if (!HASHED_FILE_RE.test(fileName)) continue;

  webFilesScanned++;

  // Skip if this file still exists in current dist/assets/
  if (currentAssets.has(fileName)) continue;

  // Orphan found: get its record ID and mark for deletion.
  const assetPath = resolve(WEB_FILES, fileName);
  const metadataPath = resolve(WEB_FILES, `${fileName}.webfile.yml`);
  const recordId = getRecordIdFromWebfile(fileName);
  if (recordId) {
    orphanedIds.push(recordId);
    orphanedFiles.push(assetPath, metadataPath);
    console.log(`   Orphan: ${fileName} (record ${recordId})`);
  } else {
    orphanedFiles.push(assetPath, metadataPath);
    console.log(`   Orphan: ${fileName} (no record ID found; deleting files only)`);
  }
}

if (orphanedIds.length === 0 && orphanedFiles.length === 0) {
  console.log('   No orphaned files found; all assets are current.');
} else {
  // Update manifest.
  if (orphanedIds.length > 0) {
    let manifestContent = readFileSync(MANIFEST, 'utf-8');
    let totalDeleted = 0;

    for (const id of orphanedIds) {
      const result = markManifestRecordDeleted(manifestContent, id);
      if (result.count > 0) {
        manifestContent = result.manifest;
        totalDeleted += result.count;
        console.log(`   Manifest: marked record ${id} as deleted (${result.count} occurrences)`);
      }
    }

    if (totalDeleted > 0) {
      writeFileSync(MANIFEST, manifestContent, 'utf-8');
      console.log(`   Manifest updated: ${totalDeleted} record(s) marked as deleted`);
    }
  }

  // Delete orphaned asset and metadata files.
  for (const filePath of orphanedFiles) {
    rmSync(filePath, { force: true });
    console.log(`   Deleted: ${basename(filePath)}`);
  }
}

console.log(`\nSummary: scanned ${webFilesTotal} files, checked ${webFilesScanned} hashed assets.`);
