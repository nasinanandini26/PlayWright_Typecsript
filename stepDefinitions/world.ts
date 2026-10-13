import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { BrowserContext, Page, APIResponse } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { ApiActions } from '../utility/ApiActions';

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

  /** True when this scenario's context was created from a saved storage state
   *  so step definitions can skip the UI login. This is the default for every
   *  scenario; only @guest scenarios (e.g. the login feature) start logged out. */
  public usingStorageState = true;

  public loginPage!: LoginPage;
  public inventoryPage!: InventoryPage;

  /** Lazily-created API client; see api() / disposeApi(). */
  private _api?: ApiActions;

  /** The most recent API response, stored by a When step for later Then steps. */
  public apiResponse!: APIResponse;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Called from the Before hook once `this.page` exists for the scenario. */
  public initializePages(): void {
    this.loginPage = new LoginPage(this.page);
    this.inventoryPage = new InventoryPage(this.page);
  }

  /**
   * Returns this scenario's ApiActions, creating its HTTP context (baseURL
   * from config's api.base.url) on first use. Lazy so UI-only scenarios never
   * spin up an unused request context. The After hook calls disposeApi().
   */
  public async api(): Promise<ApiActions> {
    if (!this._api) {
      this._api = await ApiActions.create();
    }
    return this._api;
  }

  /** Releases the API context if this scenario created one. */
  public async disposeApi(): Promise<void> {
    if (this._api) {
      await this._api.dispose();
      this._api = undefined;
    }
  }
}

setWorldConstructor(CustomWorld);
