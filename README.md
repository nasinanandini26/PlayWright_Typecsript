# playwright-ts-bdd-pom

A Playwright + TypeScript test automation framework using **Cucumber (BDD)**,
the **Page Object Model**, **CSV-driven test data**, and a **property-file**
configuration layer. Demo target: [saucedemo.com](https://www.saucedemo.com).

## Folder structure

| Requested area      | Folder                | What lives there |
|----------------------|------------------------|-------------------|
| Feature files         | `features/`            | Gherkin scenarios, tagged with test case IDs (`@TC_001`, ...) |
| Step definitions      | `stepDefinitions/`      | Glue code that calls page-object methods; also `world.ts` (Cucumber World) and `hooks.ts` (browser lifecycle) |
| Page objects (POM)    | `pages/`                | `BasePage` (abstract) + one class per page, locators + methods |
| Test data             | `testdata/`             | CSV files consumed via `utility/DataHandler.ts` |
| Config                | `config/`               | `config.properties` (URLs/creds/timeouts) + `playwright.config.ts` (typed Playwright settings) |
| Utility               | `utility/`               | `CommonActions.ts` (all Playwright interactions) + `DataHandler.ts` (`ConfigReader`, `CsvDataReader`) |
| Reports               | `testreports/`          | Timestamped, per-feature HTML/JSON reports + failure screenshots |

Two more folders round out the framework as a learning resource:

| Folder | What lives there |
|---|---|
| `notes/` | One markdown file per concept (Playwright basics, BDD/Cucumber, POM, data-driven testing, project config), each written against this project's actual files |
| `exercises/` | Self-checking practice modules (`exercises/README.md`) matched to the `notes/` topics, plus open-ended "extend the project" tasks (`exercises/EXTEND_THE_PROJECT.md`) |

## Setup

```bash
npm install
npx playwright install     # downloads browser binaries (also runs automatically via postinstall)
```

## Running tests

```bash
npm test                                   # every feature, one report set per feature
npm run test:login                         # only features/login.feature
npm run test:inventory                     # only features/inventory.feature
npm test -- --tags "@smoke"                # only scenarios tagged @smoke
npm test -- --tags "@TC_001 or @TC_006"    # run specific test case IDs
npm run typecheck                          # tsc --noEmit sanity check
```

`scripts/runTests.js` runs each `.feature` file as its own `cucumber-js`
process, so a single `npm test` produces one HTML+JSON report **per feature
file**, each stamped with a timestamp:

```
testreports/
  html/login_2026-08-13_17-42-05.html
  html/inventory_2026-08-13_17-42-11.html
  json/login_2026-08-13_17-42-05.json
  json/inventory_2026-08-13_17-42-11.json
  screenshots/...                       # auto-captured on step failure
```

## Test case IDs

Every `Scenario` carries a `@TC_00N` tag **and** repeats the ID in the
scenario title (`Scenario: TC_001 - ...`), so a test case is identifiable
from the tag (for filtering/CI), the report (title), and the feature file
(readability) alike.

## Configuration (`config/`)

- **`config.properties`** — a Java-style `.properties` file holding the base
  URL, browser/timeout settings, and login credentials. Read by
  `utility/DataHandler.ts`'s `ConfigReader`, a **Singleton** — parsed once,
  shared everywhere via `ConfigReader.getInstance()`.
- **`playwright.config.ts`** — typed Playwright settings (viewport, trace,
  video, screenshot-on-failure, timeouts) derived from `config.properties`.
  Note: the actual test *runner* here is Cucumber (`cucumber.js` +
  `stepDefinitions/hooks.ts`), not `@playwright/test`'s own runner, so this
  file isn't executed with `npx playwright test` — `hooks.ts` imports it to
  launch the browser/context consistently.
- In a real project, move the credential lines out of version control (a
  `.env` file, CI secrets, or a gitignored `config.properties.local`
  override). They're committed here only because these are SauceDemo's
  public demo accounts.

## Object-oriented design in `pages/`

- **Abstraction** — `BasePage` declares `isLoaded()` and `pageUrl` as
  `abstract`; it defines *what* every page must answer without saying *how*.
- **Inheritance** — `LoginPage` and `InventoryPage` extend `BasePage` and
  reuse `open()`, `getPageTitle()`, `captureScreenshot()`.
- **Polymorphism** — code can call `isLoaded()` on any `BasePage` reference
  and get page-appropriate behaviour; `CommonActions.selectDropdown()`
  similarly dispatches on `{ byText } | { byValue } | { byIndex }`.
- **Encapsulation** — every locator is `private readonly`; step definitions
  only ever call public page-object methods, never a selector.
- **Composition ("has-a")** — pages don't extend Playwright's `Page`, they
  hold a `CommonActions` instance and delegate every interaction to it.

## Utility layer

- **`CommonActions.ts`** — the single place that calls raw Playwright APIs:
  `click`, `enterText`, `typeText`, `selectDropdown`, `hover`, `dragAndDrop`,
  `doubleClick`, `rightClick`, `takeScreenshot`, and a set of auto-retrying
  assertion wrappers (`assertVisible`, `assertText`, `assertContainsText`,
  `assertCount`, `assertUrlContains`, ...). Page objects compose this class
  instead of touching `page.*`/`locator.*` directly.
- **`DataHandler.ts`** — `ConfigReader` (Singleton, reads `config.properties`)
  and `CsvDataReader` (reads/caches CSV files from `testdata/`, with a
  `getRowByTestCaseId()` helper used by the data-driven login scenario).

## Learning this framework

- Start with `notes/01-playwright-basics.md` and read through `notes/05-project-configuration.md` in order — each builds on the last.
- Then work through `exercises/README.md`'s Track A (5 guided, self-checking modules — `./exercises/run.sh <1-5>`) and, once comfortable, Track B (`exercises/EXTEND_THE_PROJECT.md`, open-ended tasks against this real codebase).

## Adding a new test case

1. Add a row to the relevant CSV in `testdata/` if it's data-driven.
2. Add a `Scenario`/`Scenario Outline` to a `.feature` file with the next
   `@TC_00N` tag, repeating the ID in the title.
3. Add any new page methods to the relevant class in `pages/` (locators
   stay `private`, only expose intent-revealing public methods).
4. Add/extend the step definitions in `stepDefinitions/` to wire the new
   Gherkin text to those page methods.
5. Run `npm run typecheck` then `npm test -- --tags "@TC_00N"`.
