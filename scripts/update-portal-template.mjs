/**
 * Post-build script: updates SPA-Shell template with the new hashed asset filenames.
 *
 * After `vite build` produces hashed files like:
 *   dist/assets/index-abc123.js
 *   dist/assets/style-xyz789.css
 *
 * This script finds them and patches:
 *   vehicle-pricing-intelligence-platform/.powerpages-site/web-templates/spa-shell/SPA-Shell.webtemplate.source.html
 *
 * Usage: node scripts/update-portal-template.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DIST_ASSETS = resolve(ROOT, 'dist', 'assets');
const SPA_SHELL = resolve(
  ROOT,
  'vehicle-pricing-intelligence-platform',
  '.powerpages-site',
  'web-templates',
  'spa-shell',
  'SPA-Shell.webtemplate.source.html',
);

function findAsset(pattern) {
  const file = readdirSync(DIST_ASSETS).find((f) => f.match(pattern));
  if (!file) throw new Error(`Could not find asset matching ${pattern} in ${DIST_ASSETS}`);
  return file;
}

const jsFile = findAsset(/^index-[^.]+\.js$/);
const cssFile = findAsset(/^style-[^.]+\.css$/);

const template = readFileSync(SPA_SHELL, 'utf-8');

const updated = template
  .replace(/href="\/assets\/[^"]*\.css"/, `href="/assets/${cssFile}"`)
  .replace(/src="\/assets\/[^"]*\.js"/, `src="/assets/${jsFile}"`);

if (template === updated) {
  console.warn('⚠️  No changes — template references already match?');
} else {
  writeFileSync(SPA_SHELL, updated, 'utf-8');
  console.log(`✅ SPA-Shell template updated:`);
  console.log(`   CSS → /assets/${cssFile}`);
  console.log(`   JS  → /assets/${jsFile}`);
}
