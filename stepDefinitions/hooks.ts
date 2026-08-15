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
import { chromium, firefox, webkit, Browser } from '@playwright/test';
import * as path from 'path';
import { CustomWorld } from './world';
import { ConfigReader } from '../utility/DataHandler';
import { browserName, browserLaunchOptions, playwrightConfig } from '../config/playwright.config';
import { ReportCollector } from '../utility/ReportCollector';

setDefaultTimeout(60 * 1000);

const config = ConfigReader.getInstance();
let browser: Browser;

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
  browser = await resolveBrowserType().launch(browserLaunchOptions);

  // One timestamped, self-contained report folder per feature-file run:
  // testreports/<feature>_<DDMMYYYYHHmm>/{*.html,*.json,screenshots/}.
  // scripts/runTests.js sets REPORT_RUN_DIR per spawned cucumber-js process;
  // fall back to a sensible default when running `npx cucumber-js` directly.
  const runDir =
    process.env.REPORT_RUN_DIR ?? path.resolve(process.cwd(), 'testreports', `run_${Date.now()}`);
  ReportCollector.getInstance().configure(runDir);
});

Before(async function (this: CustomWorld, { pickle }) {
  this.context = await browser.newContext({
    viewport: playwrightConfig.use?.viewport ?? null,
    baseURL: playwrightConfig.use?.baseURL,
  });
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
  await this.context?.close();
});

AfterAll(async function () {
  await browser?.close();
  ReportCollector.getInstance().writeReports();
});
