# 5. Project Setup & Configuration

## `package.json`

Key dependencies and why each is there:

| Dependency            | Role                                                              |
|-------------------------|---------------------------------------------------------------------|
| `@playwright/test`       | Browser automation (`chromium`/`firefox`/`webkit`) + `expect` + types |
| `@cucumber/cucumber`     | `Given`/`When`/`Then`, `World`, hooks, Gherkin parsing + the `cucumber-js` CLI |
| `ts-node`                | Lets Cucumber/Node run `.ts` files directly, no separate build step |
| `typescript`             | The compiler, used for `tsc --noEmit` type-checking                 |
| `csv-parse`              | Parses `testdata/*.csv` in `CsvDataReader`                          |
| `@types/node`            | Type definitions for Node's built-in modules (`fs`, `path`, ...)    |

Two scripts do the real work beyond `tsc`:

- **`npm test`** → `node scripts/runTests.js` — runs every `.feature` file, each as
  its own `cucumber-js` process, producing one timestamped HTML+JSON report pair
  per feature (see below).
- **`postinstall`** → `playwright install` — downloads the actual browser binaries
  right after `npm install`, so a fresh clone is immediately runnable.

## `config/config.properties` + `ConfigReader`

`config/config.properties` holds environment-ish settings, in the familiar
Java-style `key=value` format:

```properties
base.url=https://www.saucedemo.com
browser=chromium
headless=false
slow.mo.millis=50
default.timeout.millis=30000
```

`utility/DataHandler.ts`'s `ConfigReader` loads this once and exposes typed
getters (`.get(key)`, `.getNumber(key)`, `.getBoolean(key)`). It's implemented as a
**Singleton**:

```ts
export class ConfigReader {
  private static instance: ConfigReader;

  public static getInstance(filePath = DEFAULT_PATH): ConfigReader {
    if (!ConfigReader.instance) {
      ConfigReader.instance = new ConfigReader(filePath);
    }
    return ConfigReader.instance;
  }
}
```

Every call site — `config/playwright.config.ts`, `stepDefinitions/hooks.ts`,
`pages/BasePage.ts`, step definitions — shares the exact same parsed copy instead
of re-reading and re-parsing the file.

## Why config lives separately from `hooks.ts`

`stepDefinitions/hooks.ts` never hardcodes a browser name, URL, or timeout — it
only asks `ConfigReader` (via `config/playwright.config.ts`, which itself reads
`ConfigReader`). This separation means: if you later want config from environment
variables, a `.env` file, or a CI secret store instead of a `.properties` file, only
`ConfigReader`'s `load()` method changes; every other file is untouched.

## `config/playwright.config.ts`

This project's test *runner* is Cucumber, not `@playwright/test`'s own runner — so
`npx playwright test` is never invoked here. `playwright.config.ts` still exists as
the one typed, central place for Playwright-specific settings (viewport, trace,
video, screenshot-on-failure, timeouts), derived from `config.properties` and
imported by `hooks.ts` when it launches the browser/context. Changing a value here
changes it everywhere consistently, the same benefit a real `playwright.config.ts`
gives a `@playwright/test` project.

## `cucumber.js`

The Cucumber CLI's config file, auto-loaded by `npx cucumber-js`:

```js
module.exports = {
  default: [
    '--require-module ts-node/register',   // let Cucumber require .ts files
    '--require stepDefinitions/**/*.ts',    // where glue code lives
    '--format progress-bar',
  ].join(' '),
};
```

## `scripts/runTests.js` — one report set per feature

`npm test` doesn't call `cucumber-js` once for every `.feature` file combined — it
calls it **once per feature file**, so each run gets its own report pair, named
with the feature and a timestamp:

```
testreports/
  html/login_2026-08-13_17-42-05.html
  html/inventory_2026-08-13_17-42-11.html
  json/login_2026-08-13_17-42-05.json
  json/inventory_2026-08-13_17-42-11.json
```

The relevant bit of `scripts/runTests.js`:

```js
const jsonReport = path.join(REPORTS_DIR, 'json', `${featureName}_${stamp}.json`);
const htmlReport = path.join(REPORTS_DIR, 'html', `${featureName}_${stamp}.html`);
spawnSync('npx', ['cucumber-js', featureFile, '--format', `json:${jsonReport}`, '--format', `html:${htmlReport}`, ...extraArgs]);
```

Extra CLI args (like `--tags "@smoke"`) pass straight through:
`npm test -- --tags "@smoke"`.

## `stepDefinitions/hooks.ts` + `world.ts`

Covered in depth in `notes/02-bdd-cucumber.md`. In short: `hooks.ts` launches one
`Browser` for the whole run (`BeforeAll`) and one fresh `BrowserContext`/`Page` per
scenario (`Before`), using the settings from `config/playwright.config.ts`;
`world.ts` defines `CustomWorld`, which carries that `Page` plus ready-made page
objects into every step.

## Where to go next

- `exercises/README.md` to start practicing these concepts yourself.
