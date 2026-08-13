import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * LoginPage
 * ---------------------------------------------------------------------
 * All locators are `private readonly` (encapsulation) — nothing outside
 * this class ever touches a selector directly. Step definitions only
 * ever call the public workflow/assertion methods below.
 */
export class LoginPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('#user-name');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('#login-button');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  protected get pageUrl(): string {
    return this.config.get('base.url');
  }

  public async isLoaded(): Promise<boolean> {
    return this.actions.isVisible(this.loginButton);
  }

  // ---- Atomic actions ----
  public async enterUsername(username: string): Promise<void> {
    await this.actions.enterText(this.usernameInput, username);
  }

  public async enterPassword(password: string): Promise<void> {
    await this.actions.enterText(this.passwordInput, password);
  }

  public async clickLogin(): Promise<void> {
    await this.actions.click(this.loginButton);
  }

  // ---- Business workflow built from the atomic actions above ----
  public async login(username: string, password: string): Promise<void> {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  // ---- Reads ----
  public async getErrorMessage(): Promise<string> {
    await this.actions.waitForVisible(this.errorMessage);
    return this.actions.getText(this.errorMessage);
  }

  public async isErrorVisible(): Promise<boolean> {
    return this.actions.isVisible(this.errorMessage);
  }

  // ---- Assertions exposed as page-object methods (keeps locators private) ----
  public async assertErrorMessageContains(expected: string): Promise<void> {
    await this.actions.assertContainsText(this.errorMessage, expected);
  }

  public async assertRedirectedToInventory(): Promise<void> {
    await this.actions.assertUrlContains('inventory.html');
  }
}
