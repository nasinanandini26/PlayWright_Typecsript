import { Page, Locator, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ReportCollector } from './ReportCollector';

/** Discriminated union so selectDropdown() can pick a strategy by text, value or index. */
export type DropdownSelector = { byText: string } | { byValue: string } | { byIndex: number };

/**
 * CommonActions
 * ---------------------------------------------------------------------
 * Single home for every raw Playwright interaction (click, type, select,
 * mouse actions, screenshots, waits, assertions...). Page objects hold a
 * CommonActions instance (composition) instead of calling `page.*` /
 * `locator.*` directly, so:
 *   - every interaction gets the same wait/retry/logging behaviour,
 *   - swapping the underlying automation engine later touches one file,
 *   - page classes stay focused on locators + business workflows.
 *
 * Every action that changes page state (click, type, select, ...) also
 * captures a screenshot and files it against the currently running step
 * via ReportCollector (see utility/ReportCollector.ts), which is what
 * turns into the per-step screenshots in the generated HTML report. That
 * call is a no-op outside of a running Cucumber scenario, so CommonActions
 * stays usable from plain unit tests too.
 */
export class CommonActions {
  constructor(private readonly page: Page) {}

  /**
   * Captures the current page state and files it under `label` against
   * whichever step is currently running (see ReportCollector). Swallows
   * errors — a screenshot failure (e.g. the page/context already closed)
   * must never fail the action it documents.
   */
  private async attachActionScreenshot(label: string): Promise<void> {
    await ReportCollector.getInstance().attachScreenshot(this.page, label);
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  public async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  public async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  public async getTitle(): Promise<string> {
    return this.page.title();
  }

  public async reload(): Promise<void> {
    await this.page.reload();
  }

  // ------------------------------------------------------------------
  // Mouse actions
  // ------------------------------------------------------------------
  public async click(locator: Locator, label = 'Click'): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.click();
    await this.attachActionScreenshot(label);
  }

  public async doubleClick(locator: Locator, label = 'Double click'): Promise<void> {
    await locator.dblclick();
    await this.attachActionScreenshot(label);
  }

  public async rightClick(locator: Locator, label = 'Right click'): Promise<void> {
    await locator.click({ button: 'right' });
    await this.attachActionScreenshot(label);
  }

  public async hover(locator: Locator, label = 'Hover'): Promise<void> {
    await locator.hover();
    await this.attachActionScreenshot(label);
  }

  public async dragAndDrop(source: Locator, target: Locator, label = 'Drag and drop'): Promise<void> {
    await source.dragTo(target);
    await this.attachActionScreenshot(label);
  }

  // ------------------------------------------------------------------
  // Keyboard / text input
  // ------------------------------------------------------------------
  public async enterText(locator: Locator, text: string, clearFirst = true, label = 'Enter text'): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    if (clearFirst) {
      await locator.fill('');
    }
    await locator.fill(text);
    await this.attachActionScreenshot(label);
  }

  /** Types character-by-character (fires real keydown/keyup), for fields that react to keystrokes. */
  public async typeText(locator: Locator, text: string, delayMs = 50, label = 'Type text'): Promise<void> {
    await locator.pressSequentially(text, { delay: delayMs });
    await this.attachActionScreenshot(label);
  }

  public async pressKey(locator: Locator, key: string, label = `Press key: ${key}`): Promise<void> {
    await locator.press(key);
    await this.attachActionScreenshot(label);
  }

  public async clear(locator: Locator, label = 'Clear field'): Promise<void> {
    await locator.fill('');
    await this.attachActionScreenshot(label);
  }

  // ------------------------------------------------------------------
  // Dropdown handling — one method, three strategies (polymorphic input)
  // ------------------------------------------------------------------
  public async selectDropdown(locator: Locator, selector: DropdownSelector, label = 'Select dropdown option'): Promise<void> {
    if ('byText' in selector) {
      await locator.selectOption({ label: selector.byText });
    } else if ('byValue' in selector) {
      await locator.selectOption({ value: selector.byValue });
    } else {
      await locator.selectOption({ index: selector.byIndex });
    }
    await this.attachActionScreenshot(label);
  }

  // ------------------------------------------------------------------
  // Checkbox / radio
  // ------------------------------------------------------------------
  public async setCheckbox(locator: Locator, checked: boolean, label = checked ? 'Check checkbox' : 'Uncheck checkbox'): Promise<void> {
    if (checked) {
      await locator.check();
    } else {
      await locator.uncheck();
    }
    await this.attachActionScreenshot(label);
  }

  // ------------------------------------------------------------------
  // Reading state
  // ------------------------------------------------------------------
  public async getText(locator: Locator): Promise<string> {
    return (await locator.innerText()).trim();
  }

  public async getAllTexts(locator: Locator): Promise<string[]> {
    return locator.allInnerTexts();
  }

  public async getValue(locator: Locator): Promise<string> {
    return locator.inputValue();
  }

  public async getAttribute(locator: Locator, attribute: string): Promise<string | null> {
    return locator.getAttribute(attribute);
  }

  public async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  public async isEnabled(locator: Locator): Promise<boolean> {
    return locator.isEnabled();
  }

  public async isChecked(locator: Locator): Promise<boolean> {
    return locator.isChecked();
  }

  public async count(locator: Locator): Promise<number> {
    return locator.count();
  }

  // ------------------------------------------------------------------
  // Waits
  // ------------------------------------------------------------------
  public async waitForVisible(locator: Locator, timeoutMs = 10_000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  }

  public async waitForHidden(locator: Locator, timeoutMs = 10_000): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout: timeoutMs });
  }

  public async waitForUrl(fragment: string, timeoutMs = 10_000): Promise<void> {
    await this.page.waitForURL(new RegExp(fragment), { timeout: timeoutMs });
  }

  // ------------------------------------------------------------------
  // Screenshots
  // ------------------------------------------------------------------
  public async takeScreenshot(
    name: string,
    dir: string = path.resolve(process.cwd(), 'testreports', 'screenshots')
  ): Promise<string> {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(dir, `${name}_${stamp}.png`);
    await this.page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  // ------------------------------------------------------------------
  // Assertions — thin wrappers over Playwright's auto-retrying `expect`
  // ------------------------------------------------------------------
  public async assertVisible(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeVisible();
  }

  public async assertHidden(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeHidden();
  }

  public async assertText(locator: Locator, expected: string, message?: string): Promise<void> {
    await expect(locator, message).toHaveText(expected);
  }

  public async assertContainsText(locator: Locator, expected: string, message?: string): Promise<void> {
    await expect(locator, message).toContainText(expected);
  }

  public async assertCount(locator: Locator, expectedCount: number, message?: string): Promise<void> {
    await expect(locator, message).toHaveCount(expectedCount);
  }

  /**
   * Auto-retrying attribute assertion — useful after an action that triggers an
   * app-level state change (e.g. a CSS-animated drawer toggling `aria-hidden`)
   * where the click itself resolves before that change has actually landed in
   * the DOM. Prefer this over a one-shot `getAttribute` check when you need to
   * wait for the *result* of an action, not just the action itself.
   */
  public async assertAttribute(
    locator: Locator,
    attribute: string,
    expected: string | RegExp,
    message?: string
  ): Promise<void> {
    await expect(locator, message).toHaveAttribute(attribute, expected);
  }

  public async assertEnabled(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeEnabled();
  }

  public async assertDisabled(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeDisabled();
  }

  public async assertChecked(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeChecked();
  }

  public async assertUrlContains(fragment: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(fragment));
  }

  public async assertTitle(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(expected);
  }
}
