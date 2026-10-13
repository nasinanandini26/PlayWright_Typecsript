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
| Utility               | `utility/`               | `CommonActions.ts` (all Playwright interactions) + `DataHandler.ts` (`ConfigReader`, `CsvDataReader`) + `ReportCollector.ts` (builds the HTML/JSON report) |
| Reports               | `testreports/`          | One timestamped, self-contained folder per feature run — HTML report, JSON, and a `screenshots/` folder — with a screenshot after every action |

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
process, so a single `npm test` produces one self-contained report folder
**per feature file**, timestamped `DDMMYYYYHHmm`:

```
testreports/
  login_150820260218/
    login_150820260218.html   <- open this in a browser
    login_150820260218.json
    screenshots/
      001_browser-launched.png
      002_enter-username-standard-user.png
      003_enter-password.png
      004_click-login-button.png
      005_final-state.png
      ...
  inventory_150820260225/
    inventory_150820260225.html
    inventory_150820260225.json
    screenshots/...
```

### HTML/JSON report (screenshot after every action, per step)

Screenshot capture happens centrally in `utility/CommonActions.ts` — not
copy-pasted into every step definition — so it applies automatically to
every current and future click/type/select action, and `utility/ReportCollector.ts`
files each one against whichever Gherkin step is currently running:

- Every `click`, `enterText`, `typeText`, `pressKey`, `selectDropdown`,
  `setCheckbox`, `hover`, `doubleClick`, `rightClick` and `dragAndDrop` call
  in `CommonActions` captures a screenshot the moment it completes and
  attaches it to the step that triggered it.
- Each scenario also gets a "Browser launched" screenshot before its first
  step and a "Final state" screenshot after its last, pass or fail
  (`Before`/`After` hooks in `stepDefinitions/hooks.ts`).
- Failed steps get an extra "Failure screenshot" at the exact point of
  failure (`AfterStep` hook).

The generated HTML shows each step's Gherkin text (its "description") next
to its status/duration, with its screenshots as small thumbnails directly
underneath — **no download links, no new tab**: clicking a thumbnail just
expands it in place on the same page (plain client-side JS toggling the
image's own size). Scenarios are collapsible `<details>` sections, open by
default when failed.

Open the report straight from the console summary each run prints, e.g.:

```bash
open testreports/login_150820260218/login_150820260218.html
```

Because the folder is self-contained (HTML + JSON + `screenshots/` all
together, only relative paths), it can be zipped and shared, or archived by
CI as a single build artifact, without needing a server to view it.

## CI/CD: Jenkins (local, via Docker Desktop)

This repo ships everything needed to run a Jenkins controller locally and
have it build this suite straight from GitHub:

| Piece | What it does |
|---|---|
| `jenkins/` | `Dockerfile` (official Jenkins LTS image + Docker CLI, so Jenkins can launch sibling containers against the host's Docker daemon), `plugins.txt`, `docker-compose.yml`, `docker-compose.override.yml` (local-only `admin`/`admin` login), `init.groovy.d/` (provisions that account + skips the setup wizard). |
| `Jenkinsfile` | The pipeline itself: checkout → run tests inside Microsoft's official `playwright` Docker image → publish the HTML report + archive `testreports/`. |

**Why a Docker agent:** the `playwright` image already has the right browsers
and OS deps baked in, so the Jenkins host itself only ever needs Docker —
nothing Node/Playwright-specific to install or keep in sync.

### 1. Start Jenkins

```bash
cd jenkins
DOCKER_GID=$(docker run --rm -v /var/run/docker.sock:/var/run/docker.sock alpine stat -c '%g' /var/run/docker.sock)
docker compose up -d --build
```

Open **http://localhost:8080** and log in with **`admin` / `admin`** — no
setup wizard, that account is provisioned automatically
(`docker-compose.override.yml` + `init.groovy.d/basic-security.groovy`;
see `notes/06-cicd-jenkins.md` for how, and why it's local-only).

### 2. Point a pipeline job at GitHub

Create a **Pipeline** job with "Pipeline script from SCM" → Git →
`https://github.com/nasinanandini26/PlayWright_Typecsript.git`, branch
`main` (or whichever branch has the `Jenkinsfile`), script path `Jenkinsfile`.

### 3. Run it

Build with parameters:
- `TAGS` — Cucumber tag expression (e.g. `@smoke`), blank runs every feature.
- `PLAYWRIGHT_IMAGE` — defaults to `mcr.microsoft.com/playwright:v1.47.0-jammy`;
  bump the tag if `@playwright/test` in `package.json` is upgraded.

The build archives `testreports/**` and publishes the latest run's HTML
report under "Cucumber BDD Report" on the build page.

`config/config.properties` defaults to `headless=false` for local debugging;
`ConfigReader` now lets any property be overridden by an env var (dots →
underscores, uppercased — e.g. `headless` → `HEADLESS`), and the `Jenkinsfile`
sets `HEADLESS=true` since there's no display in CI.

### Teardown

```bash
cd jenkins
docker compose down -v   # -v also wipes jenkins_home (jobs, credentials)
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
  instead of touching `page.*`/`locator.*` directly. Every state-changing
  action also captures a labeled screenshot for the report at the moment it
  runs — see [the report section](#htmljson-report-screenshot-after-every-action-per-step)
  above; pass a descriptive `label` argument (as `pages/LoginPage.ts` and
  `pages/InventoryPage.ts` do) for a readable report entry.
- **`ReportCollector.ts`** — a module-level singleton (safe because
  `cucumber.js` runs scenarios sequentially, never `--parallel`) that tracks
  the currently running scenario/step, saves screenshots into that run's
  `screenshots/` folder, and renders the final HTML + JSON once
  `stepDefinitions/hooks.ts`'s `AfterAll` calls `writeReports()`.
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
