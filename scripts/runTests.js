#!/usr/bin/env node
'use strict';

/**
 * scripts/runTests.js
 * ---------------------------------------------------------------------
 * Runs each .feature file under /features as its own `cucumber-js`
 * process so every feature gets its own report pair:
 *
 *   testreports/json/<featureName>_<yyyy-mm-dd_HH-MM-ss>.json
 *   testreports/html/<featureName>_<yyyy-mm-dd_HH-MM-ss>.html
 *
 * Usage:
 *   npm test                          -> runs every feature file
 *   npm test -- --tags "@smoke"       -> forwards args to cucumber-js
 *   node scripts/runTests.js features/login.feature
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FEATURES_DIR = path.join(ROOT_DIR, 'features');
const REPORTS_DIR = path.join(ROOT_DIR, 'testreports');

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  );
}

function findFeatureFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return findFeatureFiles(fullPath);
    return entry.name.endsWith('.feature') ? [fullPath] : [];
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const passthroughArgs = process.argv.slice(2);
  const explicitFeatureArgs = passthroughArgs.filter((a) => a.endsWith('.feature'));
  const optionArgs = passthroughArgs.filter((a) => !a.endsWith('.feature'));

  const featureFiles = explicitFeatureArgs.length > 0
    ? explicitFeatureArgs.map((f) => path.resolve(ROOT_DIR, f))
    : findFeatureFiles(FEATURES_DIR);

  if (featureFiles.length === 0) {
    console.error(`No .feature files found in ${FEATURES_DIR}`);
    process.exit(1);
  }

  ensureDir(path.join(REPORTS_DIR, 'json'));
  ensureDir(path.join(REPORTS_DIR, 'html'));

  const results = [];

  for (const featureFile of featureFiles) {
    const featureName = path.basename(featureFile, '.feature');
    const stamp = timestamp();
    const jsonReport = path.join(REPORTS_DIR, 'json', `${featureName}_${stamp}.json`);
    const htmlReport = path.join(REPORTS_DIR, 'html', `${featureName}_${stamp}.html`);

    console.log(`\n▶ Running feature: ${featureName}.feature`);

    const args = [
      'cucumber-js',
      featureFile,
      '--format', `json:${jsonReport}`,
      '--format', `html:${htmlReport}`,
      ...optionArgs,
    ];

    const run = spawnSync('npx', args, {
      stdio: 'inherit',
      cwd: ROOT_DIR,
      shell: process.platform === 'win32',
    });

    results.push({
      feature: `${featureName}.feature`,
      status: run.status === 0 ? 'PASSED' : 'FAILED',
      htmlReport: path.relative(ROOT_DIR, htmlReport),
    });
  }

  console.log('\n================ TEST SUMMARY ================');
  results.forEach((r) => {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${r.feature.padEnd(28)} -> ${r.htmlReport}`);
  });
  console.log('================================================\n');

  process.exit(results.some((r) => r.status === 'FAILED') ? 1 : 0);
}

main();
