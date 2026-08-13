import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { BrowserContext, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';

/**
 * CustomWorld
 * ---------------------------------------------------------------------
 * Cucumber creates one instance of this class per scenario and injects
 * it as `this` into every step definition and hook. It carries the
 * Playwright context/page for that scenario plus one ready-to-use
 * instance of each Page Object, so step definitions never `new` a page
 * class themselves.
 */
export class CustomWorld extends World {
  public context!: BrowserContext;
  public page!: Page;

  public loginPage!: LoginPage;
  public inventoryPage!: InventoryPage;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Called from the Before hook once `this.page` exists for the scenario. */
  public initializePages(): void {
    this.loginPage = new LoginPage(this.page);
    this.inventoryPage = new InventoryPage(this.page);
  }
}

setWorldConstructor(CustomWorld);
