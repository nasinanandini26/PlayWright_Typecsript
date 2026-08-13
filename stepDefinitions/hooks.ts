import { Before, After, AfterStep, BeforeAll, AfterAll, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, firefox, webkit, Browser } from '@playwright/test';
import { CustomWorld } from './world';
import { ConfigReader } from '../utility/DataHandler';
import { browserName, browserLaunchOptions, playwrightConfig } from '../config/playwright.config';

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

BeforeAll(async function () {
  browser = await resolveBrowserType().launch(browserLaunchOptions);
});

Before(async function (this: CustomWorld) {
  this.context = await browser.newContext({
    viewport: playwrightConfig.use?.viewport ?? null,
    baseURL: playwrightConfig.use?.baseURL,
  });
  this.context.setDefaultTimeout(config.getNumber('default.timeout.millis'));
  this.page = await this.context.newPage();
  this.initializePages();
});

// Attach a full-page screenshot to the report for every failed step.
AfterStep(async function (this: CustomWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    const screenshotBuffer = await this.page.screenshot({ fullPage: true });
    this.attach(screenshotBuffer, 'image/png');
  }
});

After(async function (this: CustomWorld) {
  await this.context?.close();
});

AfterAll(async function () {
  await browser?.close();
});
