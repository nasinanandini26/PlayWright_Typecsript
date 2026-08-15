import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export type SortOption =
  | 'Name (A to Z)'
  | 'Name (Z to A)'
  | 'Price (low to high)'
  | 'Price (high to low)';

/**
 * InventoryPage
 * ---------------------------------------------------------------------
 * Demonstrates a *dynamic* locator built from a parameter (product name)
 * via a private factory method — still fully encapsulated, callers never
 * see a selector string.
 */
export class InventoryPage extends BasePage {
  private readonly pageTitle: Locator;
  private readonly sortDropdown: Locator;
  private readonly cartBadge: Locator;
  private readonly inventoryItemNames: Locator;
  private readonly inventoryItemPrices: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('.title');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.inventoryItemNames = page.locator('.inventory_item_name');
    this.inventoryItemPrices = page.locator('.inventory_item_price');
  }

  protected get pageUrl(): string {
    return `${this.config.get('base.url')}/inventory.html`;
  }

  public async isLoaded(): Promise<boolean> {
    return this.actions.isVisible(this.pageTitle);
  }

  // ---- Dynamic (per-product) locators, kept private ----
  private addToCartButtonFor(productName: string): Locator {
    return this.page
      .locator('.inventory_item', { hasText: productName })
      .getByRole('button', { name: /add to cart/i });
  }

  private removeFromCartButtonFor(productName: string): Locator {
    return this.page
      .locator('.inventory_item', { hasText: productName })
      .getByRole('button', { name: /remove/i });
  }

  // ---- Actions ----
  public async addProductToCart(productName: string): Promise<void> {
    await this.actions.click(this.addToCartButtonFor(productName), `Add "${productName}" to cart`);
  }

  public async removeProductFromCart(productName: string): Promise<void> {
    await this.actions.click(this.removeFromCartButtonFor(productName), `Remove "${productName}" from cart`);
  }

  public async sortProductsBy(option: SortOption): Promise<void> {
    await this.actions.selectDropdown(this.sortDropdown, { byText: option }, `Sort products by "${option}"`);
  }

  // ---- Reads ----
  public async getProductNames(): Promise<string[]> {
    return this.actions.getAllTexts(this.inventoryItemNames);
  }

  public async getProductPrices(): Promise<number[]> {
    const priceTexts = await this.actions.getAllTexts(this.inventoryItemPrices);
    return priceTexts.map((text) => Number(text.replace('$', '')));
  }

  public async getCartCount(): Promise<number> {
    if (!(await this.actions.isVisible(this.cartBadge))) {
      return 0;
    }
    return Number(await this.actions.getText(this.cartBadge));
  }

  // ---- Assertions exposed as page-object methods ----
  public async assertCartCount(expected: number): Promise<void> {
    if (expected === 0) {
      await this.actions.assertHidden(this.cartBadge);
    } else {
      await this.actions.assertText(this.cartBadge, String(expected));
    }
  }

  public async assertSortedByPriceAscending(): Promise<void> {
    const prices = await this.getProductPrices();
    const sorted = [...prices].sort((a, b) => a - b);
    if (JSON.stringify(prices) !== JSON.stringify(sorted)) {
      throw new Error(`Expected prices sorted ascending but got: [${prices.join(', ')}]`);
    }
  }
}
