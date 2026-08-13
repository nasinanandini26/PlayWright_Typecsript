import * as fs from 'fs';
import * as path from 'path';

/**
 * MODULE 5 — PROJECT CONFIGURATION. Compare with utility/DataHandler.ts's
 * ConfigReader. Read notes/05-project-configuration.md first.
 *
 * Data file: exercises/module-05-project-configuration/config/exercise.properties
 *   app.env=staging
 *   retry.count=3
 *   dry.run=false
 *
 * QUESTIONS (think through these before/while you code):
 *   1. Does the real ConfigReader.get(key) support any override today, or does it
 *      only ever read config.properties?
 *   2. What real-world workflow does an environment-variable override make
 *      possible, without editing any file?
 *   3. Why does ConfigReader live as its own class instead of hooks.ts reading
 *      config.properties directly?
 *
 * YOUR TASK
 * Implement three typed getters — env(), retryCount(), dryRun() — that read from
 * the parsed PROPERTIES map, but where an environment variable of the same name
 * (e.g. `app.env=production ./exercises/run.sh 5`) ALWAYS wins over the file:
 *
 *   process.env[key] ?? PROPERTIES.get(key)
 *
 * The validation test sets/clears process.env entries around calls to prove this
 * override actually works, not just that the file value round-trips.
 *
 * HOW TO RUN (validates your code)
 *   ./exercises/run.sh 5
 */

function loadProperties(filePath: string): Map<string, string> {
  const properties = new Map<string, string>();
  const content = fs.readFileSync(filePath, 'utf-8');
  content.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) return;
    properties.set(line.substring(0, separatorIndex).trim(), line.substring(separatorIndex + 1).trim());
  });
  return properties;
}

const DATA_FILE = path.resolve(__dirname, '..', 'config', 'exercise.properties');
const PROPERTIES = loadProperties(DATA_FILE);

/**
 * TODO 1: implement this the same way the real ConfigReader.get(key) reads the
 * file, but with an environment-variable override checked first: an env var of
 * the same name should win, falling back to PROPERTIES otherwise. Throw an Error
 * if the key isn't found in either place.
 */
function get(key: string): string {
  throw new Error('TODO: implement get');
}

/** TODO 2: return the "app.env" value via get(). */
export function env(): string {
  throw new Error('TODO: implement env');
}

/** TODO 3: return the "retry.count" value via get(), parsed as a number. */
export function retryCount(): number {
  throw new Error('TODO: implement retryCount');
}

/** TODO 4: return the "dry.run" value via get(), parsed as a boolean ("true" -> true). */
export function dryRun(): boolean {
  throw new Error('TODO: implement dryRun');
}
