import { Page } from '@playwright/test';
import { CommonActions } from '../utility/CommonActions';
import { ConfigReader } from '../utility/DataHandler';

/**
 * BasePage
 * ---------------------------------------------------------------------
 * Abstract superclass for every Page Object.
 *
 *  - Inheritance:   LoginPage, InventoryPage, ... extend this class and
 *                    reuse open()/getPageTitle()/captureScreenshot().
 *  - Abstraction:   `isLoaded()` and `pageUrl` are declared but not
 *                    implemented here — each concrete page is forced to
 *                    define what "loaded" and "my URL" mean for itself.
 *  - Polymorphism:  callers can hold a `BasePage` reference and call
 *                    `isLoaded()` without knowing which concrete page
 *                    they have; each subclass supplies its own behaviour.
 *  - Encapsulation: `page`/`actions`/`config` are `protected`, visible
 *                    to subclasses but hidden from step definitions,
 *                    which may only call the public page-object methods.
 *  - Composition:   rather than re-implementing Playwright calls, every
 *                    page *has a* CommonActions instance ("has-a") and
 *                    delegates all interactions to it.
 */
export abstract class BasePage {
  protected readonly page: Page;
  protected readonly actions: CommonActions;
  protected readonly config: ConfigReader;

  protected constructor(page: Page) {
    this.page = page;
    this.actions = new CommonActions(page);
    this.config = ConfigReader.getInstance();
  }

  /** Each concrete page defines the DOM signal that proves it has finished loading. */
  public abstract isLoaded(): Promise<boolean>;

  /** Each concrete page defines its own navigable URL. */
  protected abstract get pageUrl(): string;

  /** Navigates directly to this page's URL. */
  public async open(): Promise<void> {
    await this.actions.goto(this.pageUrl);
  }

  public async getPageTitle(): Promise<string> {
    return this.actions.getTitle();
  }

  public async captureScreenshot(name: string): Promise<string> {
    return this.actions.takeScreenshot(name);
  }
}
