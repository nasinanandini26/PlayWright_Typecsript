import {
  Before,
  BeforeStep,
  After,
  AfterStep,
  BeforeAll,
  AfterAll,
  setDefaultTimeout,
  Status,
} from '@cucumber/cucumber';
import { PickleStepType, TestStepResultStatus } from '@cucumber/messages';
import { chromium, firefox, webkit, Browser, BrowserContextOptions } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { CustomWorld } from './world';
import { ConfigReader } from '../utility/DataHandler';
import { browserName, browserLaunchOptions, playwrightConfig } from '../config/playwright.config';
import { ReportCollector } from '../utility/ReportCollector';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';

setDefaultTimeout(60 * 1000);

const config = ConfigReader.getInstance();
let browser: Browser | undefined;

/** Storage-state reuse is the default for EVERY scenario; one carrying this
 *  tag instead starts from a clean, logged-out context — e.g. the login
 *  feature, which must exercise the login form itself. See prepareStorageState(). */
const GUEST_TAG = '@guest';

/** Pure API scenarios carry this tag: they never touch the browser UI, so the
 *  Before hook skips context/page setup (and the storage-state login) for them
 *  and they interact only through this.api() (see utility/ApiActions.ts). */
const API_TAG = '@api';

/** Launches the browser on first UI use and reuses it for the rest of the
 *  process. Lazy so an API-only feature run never starts a browser at all. */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await resolveBrowserType().launch(browserLaunchOptions);
  }
  return browser;
}

/** Absolute path of the storage-state file configured in config.properties. */
function resolveStorageStatePath(): string {
  const configured = config.get('storage.state.path');
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

// Memoized per cucumber-js process: the first @authenticated scenario triggers
// exactly one real UI login, whose cookies + localStorage are written to
// storage.state.path. Every later @authenticated scenario (and re-run of this
// process) just loads that file into its context instead of logging in again.
let preparedStorageStatePath: string | null = null;

async function prepareStorageState(): Promise<string> {
  if (preparedStorageStatePath) return preparedStorageStatePath;

  const target = resolveStorageStatePath();
  const setupContext = await (await getBrowser()).newContext({
    viewport: playwrightConfig.use?.viewport ?? null,
    baseURL: playwrightConfig.use?.baseURL,
  });
  try {
    const page = await setupContext.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(config.get('valid.username'), config.get('valid.password'));
    // This runs before any scenario starts, so ReportCollector screenshots are
    // no-ops; assert the login worked before we trust the saved session.
    if (!(await new InventoryPage(page).isLoaded())) {
      throw new Error('Storage-state setup failed: login did not reach the inventory page.');
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await setupContext.storageState({ path: target });
  } finally {
    await setupContext.close();
  }

  preparedStorageStatePath = target;
  return preparedStorageStatePath;
}

/** Picks the correct Playwright browser type based on config/config.properties. */
function resolveBrowserType() {
  switch (browserName) {
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    default:
      return chromium;
  }
}

/** Cucumber's PickleStep only carries a Context/Action/Outcome type, not the literal Given/When/Then keyword. */
function keywordFor(type: PickleStepType | undefined): string {
  switch (type) {
    case PickleStepType.CONTEXT:
      return 'Given';
    case PickleStepType.ACTION:
      return 'When';
    case PickleStepType.OUTCOME:
      return 'Then';
    default:
      return 'And';
  }
}

function durationMs(duration?: { seconds: number; nanos: number }): number {
  if (!duration) return 0;
  return Math.round(duration.seconds * 1000 + duration.nanos / 1e6);
}

function statusText(status?: TestStepResultStatus): string {
  return status ?? 'UNKNOWN';
}

BeforeAll(async function () {
  // The browser is launched lazily on first UI use (see getBrowser()), so an
  // API-only feature run never starts one. Here we only set up the report dir:
  // one timestamped, self-contained folder per feature-file run —
  // testreports/<feature>_<DDMMYYYYHHmm>/{*.html,*.json,screenshots/}.
  // scripts/runTests.js sets REPORT_RUN_DIR per spawned cucumber-js process;
  // fall back to a sensible default when running `npx cucumber-js` directly.
  const runDir =
    process.env.REPORT_RUN_DIR ?? path.resolve(process.cwd(), 'testreports', `run_${Date.now()}`);
  ReportCollector.getInstance().configure(runDir);
});

Before(async function (this: CustomWorld, { pickle }) {
  // Pure API scenarios never touch the browser UI, so skip context/page setup
  // (and the storage-state login) entirely — they use this.api() instead.
  if (pickle.tags.some((tag) => tag.name === API_TAG)) {
    this.usingStorageState = false;
    ReportCollector.getInstance().startScenario(
      pickle.name,
      pickle.tags.map((tag) => tag.name)
    );
    return;
  }

  // By default every UI scenario loads the saved session (storage.state.path)
  // into its context, so it starts already logged in without touching the
  // login form. @guest scenarios opt out and start from a clean context —
  // the login feature needs the real login form.
  this.usingStorageState = !pickle.tags.some((tag) => tag.name === GUEST_TAG);

  const contextOptions: BrowserContextOptions = {
    viewport: playwrightConfig.use?.viewport ?? null,
    baseURL: playwrightConfig.use?.baseURL,
  };
  if (this.usingStorageState) {
    // Prepared before startScenario() so its UI-login screenshots are no-ops.
    contextOptions.storageState = await prepareStorageState();
  }

  this.context = await (await getBrowser()).newContext(contextOptions);
  this.context.setDefaultTimeout(config.getNumber('default.timeout.millis'));
  this.page = await this.context.newPage();
  this.initializePages();

  ReportCollector.getInstance().startScenario(
    pickle.name,
    pickle.tags.map((tag) => tag.name)
  );
  // First screenshot in every scenario's report section, per the "browser
  // launched" example — captured before any step has run.
  await ReportCollector.getInstance().attachScreenshot(this.page, 'Browser launched');
});

// Opens a report entry (description + screenshot slot) for the step that's about to run.
BeforeStep(async function (this: CustomWorld, { pickleStep }) {
  ReportCollector.getInstance().startStep(keywordFor(pickleStep.type), pickleStep.text);
});

// Closes that entry with its outcome. Most steps already picked up a
// screenshot from CommonActions (see utility/CommonActions.ts) at the
// moment of the click/type/select; failed steps get one more here,
// capturing the state at the point of failure specifically.
AfterStep(async function (this: CustomWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    await ReportCollector.getInstance().attachScreenshot(this.page, 'Failure screenshot');
  }
  ReportCollector.getInstance().endStep(statusText(result?.status), durationMs(result?.duration), result?.message);
});

After(async function (this: CustomWorld, { result }) {
  if (this.page) {
    await ReportCollector.getInstance().attachScreenshot(this.page, 'Final state');
  }
  ReportCollector.getInstance().endScenario(statusText(result?.status), durationMs(result?.duration));
  await this.disposeApi();
  await this.context?.close();
});

AfterAll(async function () {
  await browser?.close();
  ReportCollector.getInstance().writeReports();
});
