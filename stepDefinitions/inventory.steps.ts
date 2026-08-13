import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { SortOption } from '../pages/InventoryPage';

Given('I have added {string} to the cart', async function (this: CustomWorld, productName: string) {
  await this.inventoryPage.addProductToCart(productName);
});

When('I add {string} to the cart', async function (this: CustomWorld, productName: string) {
  await this.inventoryPage.addProductToCart(productName);
});

When('I remove {string} from the cart', async function (this: CustomWorld, productName: string) {
  await this.inventoryPage.removeProductFromCart(productName);
});

When('I sort products by {string}', async function (this: CustomWorld, sortOption: string) {
  await this.inventoryPage.sortProductsBy(sortOption as SortOption);
});

Then('the cart badge should show {string} item(s)', async function (this: CustomWorld, expectedCount: string) {
  await this.inventoryPage.assertCartCount(Number(expectedCount));
});

Then('the products should be sorted by price in ascending order', async function (this: CustomWorld) {
  await this.inventoryPage.assertSortedByPriceAscending();
});
