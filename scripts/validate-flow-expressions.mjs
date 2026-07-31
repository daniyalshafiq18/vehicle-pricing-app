#!/usr/bin/env node
/**
 * validate-flow-expressions.mjs
 *
 * Extracts Power Automate expressions from docs/power-automate-cloud-only-design.md
 * and validates each one for:
 *   1. Parenthesis balance (ignoring single-quoted string literals)
 *   2. Single-argument functions (trim/first/last/...) receiving exactly one argument
 *
 * Why: Flow 3 expressions are hand-maintained in the design doc. A typo like
 * `trim(first(...), '')` passes the paren-balance check but fails at runtime in
 * Power Automate (`InvalidTemplate: 'trim' must have only one parameter`).
 * Every live Flow test costs a Cloudflare cooldown (~30 min), so catching these
 * locally first saves test cycles.
 *
 * Usage:
 *   node scripts/validate-flow-expressions.mjs                 # default doc path
 *   node scripts/validate-flow-expressions.mjs <path-to-md>    # explicit doc
 *   npm run validate:flows
 *
 * Exit code: 0 if all expressions are valid, 1 if any fail.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const docPath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve('docs/power-automate-cloud-only-design.md');

const text = readFileSync(docPath, 'utf8');
const lines = text.split(/\r?\n/);

/** Functions that must take exactly one argument in Power Automate. */
const SINGLE_ARG_FNS = new Set(['trim', 'first', 'last', 'single', 'int', 'string', 'float', 'bool', 'toLower', 'toUpper']);

/** Skip over a single-quoted string starting at the opening quote. Handles `''` doubling. */
function skipString(expr, i) {
  // i points at the opening quote
  i++;
  while (i < expr.length) {
    if (expr[i] === "'") {
      if (expr[i + 1] === "'") {
        i += 2; // literal quote inside a string (Power Automate escapes by doubling)
        continue;
      }
      break; // closing quote
    }
    i++;
  }
  return i;
}

/** Returns the index of the paren matching `openIdx` (which must be a `(`), or -1. */
function matchingParen(expr, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "'") {
      i = skipString(expr, i);
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Paren-balance check ignoring strings. Returns an error message or null. */
function validateParens(expr) {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "'") {
      i = skipString(expr, i);
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth < 0) return 'close-paren before any open-paren';
    }
  }
  return depth === 0 ? null : `unbalanced (depth=${depth})`;
}

/**
 * Arity check for single-arg functions. For each `name(...)` call, scans the
 * argument span and flags any comma at the top level of that call.
 */
function validateSingleArg(expr, name) {
  const problems = [];
  const re = new RegExp(`\\b${name}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(expr)) !== null) {
    const openIdx = expr.indexOf('(', m.index);
    const closeIdx = matchingParen(expr, openIdx);
    if (closeIdx === -1) continue; // balance is reported separately
    let depth = 0;
    for (let i = openIdx + 1; i < closeIdx; i++) {
      const ch = expr[i];
      if (ch === "'") {
        i = skipString(expr, i);
        continue;
      }
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        problems.push(`${name}() receives 2+ arguments — must have exactly one`);
        break;
      }
    }
  }
  return problems;
}

/** Collect fenced code blocks with the caption text (up to 3 lines above the fence). */
function findBlocks(lines) {
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('```')) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('```')) j++;
      if (j >= lines.length) break;
      const content = lines.slice(i + 1, j).join('\n');
      const caption = lines.slice(Math.max(0, i - 3), i).join(' ').trim();
      blocks.push({ startLine: i + 1, endLine: j + 1, content, caption });
      i = j;
    }
  }
  return blocks;
}

function labelFor(block) {
  const nameMatch = block.caption.match(/Name:\s*`([^`]+)`/);
  if (nameMatch) return nameMatch[1];
  const firstLine = block.content.split('\n')[0].trim();
  return firstLine.length > 55 ? firstLine.slice(0, 55) + '…' : firstLine;
}

const blocks = findBlocks(lines);
let checked = 0;
let failures = 0;

for (const block of blocks) {
  // A block is treated as an expression only if it is a documented "Input: … Expression" step,
  // or its content actually starts with a Power Automate expression / `@{...}` wrapper.
  // This excludes HTML templates, ASCII diagrams, URL samples, and JS snippets.
  const isExpression =
    /Input:?.*\bExpression\b/i.test(block.caption) ||
    /^\s*@\{/.test(block.content) ||
    /^\s*(?:if|concat|contains|split|trim|replace|skip|first|last|int|string|toLower|toUpper|startsWith|substring|add|div|mul|sub|variables|outputs|triggerBody|triggerOutputs|body|single|float|bool|equals|not|empty|coalesce|formatDateTime|utcNow|mod|rand|length|indexOf|lastIndexOf)\s*\(/.test(
      block.content
    );
  if (!isExpression) continue;

  checked++;
  const label = labelFor(block);
  const expr = block.content.trim();

  const problems = [];
  const balanceErr = validateParens(expr);
  if (balanceErr) problems.push(`paren ${balanceErr}`);
  for (const fn of SINGLE_ARG_FNS) {
    if (new RegExp(`\\b${fn}\\s*\\(`).test(expr)) {
      problems.push(...validateSingleArg(expr, fn));
    }
  }

  if (problems.length) {
    failures++;
    console.log(`✗ FAIL  line ${block.startLine}  (${label})`);
    for (const p of problems) console.log(`      - ${p}`);
  } else {
    console.log(`✓  ok   line ${block.startLine}  (${label})`);
  }
}

console.log(`\nValidated ${checked} expression block(s) from ${docPath}`);
if (failures) {
  console.log(`✗ ${failures} FAILED — fix before the next live Flow test.`);
  process.exit(1);
} else {
  console.log('✓ All expressions balanced and arity-correct.');
}
