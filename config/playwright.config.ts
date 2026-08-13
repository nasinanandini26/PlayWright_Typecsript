import type { PlaywrightTestConfig } from '@playwright/test';
import { ConfigReader } from '../utility/DataHandler';

/**
 * playwright.config.ts
 * ---------------------------------------------------------------------
 * IMPORTANT: this project's test *runner* is Cucumber (see cucumber.js
 * and stepDefinitions/hooks.ts), not `@playwright/test`'s own runner —
 * so you won't run `npx playwright test` here. This file still exists
 * as the single, typed source of truth for Playwright's own settings
 * (base URL, viewport, timeouts, trace/video/screenshot capture). The
 * BrowserManager used by hooks.ts imports `browserLaunchOptions` and
 * `playwrightConfig.use` when it launches the browser/context, so
 * changing a value here changes it everywhere consistently.
 */
const config = ConfigReader.getInstance();

export const browserName: 'chromium' | 'firefox' | 'webkit' =
  (config.getOrDefault('browser', 'chromium') as 'chromium' | 'firefox' | 'webkit') ?? 'chromium';

export const browserLaunchOptions = {
  headless: config.getBoolean('headless'),
  slowMo: config.getNumber('slow.mo.millis'),
};

export const playwrightConfig: PlaywrightTestConfig = {
  use: {
    baseURL: config.get('base.url'),
    viewport: {
      width: config.getNumber('viewport.width'),
      height: config.getNumber('viewport.height'),
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: config.getNumber('default.timeout.millis'),
    navigationTimeout: config.getNumber('default.timeout.millis'),
  },
  timeout: config.getNumber('default.timeout.millis') * 2,
};

export default playwrightConfig;
