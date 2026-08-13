// Cucumber CLI profile, auto-loaded by `npx cucumber-js`.
// scripts/runTests.js appends the feature file path + per-run --format
// flags on top of this at execution time (see that file for the report
// naming scheme).
const common = [
  '--require-module ts-node/register',
  '--require stepDefinitions/**/*.ts',
  '--format progress-bar',
].join(' ');

module.exports = {
  default: common,
};
