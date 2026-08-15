// Cucumber CLI profile, auto-loaded by `npx cucumber-js`.
// scripts/runTests.js sets REPORT_RUN_DIR (per feature file, per run) on
// top of this before spawning cucumber-js — stepDefinitions/hooks.ts and
// utility/ReportCollector.ts read that env var to know where to write the
// self-contained HTML+JSON report and screenshots for that run.
const common = [
  '--require-module ts-node/register',
  '--require stepDefinitions/**/*.ts',
  '--format progress-bar',
].join(' ');

module.exports = {
  default: common,
};
