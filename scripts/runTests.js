#!/usr/bin/env node
'use strict';

/**
 * scripts/runTests.js
 * ---------------------------------------------------------------------
 * Runs each .feature file under /features as its own `cucumber-js`
 * process, so every feature gets its own self-contained, timestamped
 * report folder:
 *
 *   testreports/<featureName>_<DDMMYYYYHHmm>/
 *     <featureName>_<DDMMYYYYHHmm>.html   <- one report, embeds every screenshot
 *     <featureName>_<DDMMYYYYHHmm>.json   <- same data as plain JSON
 *     screenshots/*.png                   <- every screenshot the run captured
 *
 * The folder path is handed to the cucumber-js child process via the
 * REPORT_RUN_DIR env var; stepDefinitions/hooks.ts + utility/ReportCollector.ts
 * do the actual writing (scenario/step lifecycle -> JSON + HTML) once the
 * feature finishes running.
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

/** DDMMYYYYHHmm, e.g. 150820260218 for 15 Aug 2026, 02:18 — matches the folder-naming scheme. */
function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}`;
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

  ensureDir(REPORTS_DIR);

  const results = [];

  for (const featureFile of featureFiles) {
    const featureName = path.basename(featureFile, '.feature');
    const runFolderName = `${featureName}_${timestamp()}`;
    const runDir = path.join(REPORTS_DIR, runFolderName);
    const htmlReport = path.join(runDir, `${runFolderName}.html`);

    console.log(`\n▶ Running feature: ${featureName}.feature`);

    const run = spawnSync(
      'npx',
      ['cucumber-js', featureFile, ...optionArgs],
      {
        stdio: 'inherit',
        cwd: ROOT_DIR,
        shell: process.platform === 'win32',
        env: { ...process.env, REPORT_RUN_DIR: runDir },
      }
    );

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
