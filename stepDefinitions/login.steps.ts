import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './world';
import { CsvDataReader, ConfigReader } from '../utility/DataHandler';

/**
 * login.steps.ts
 * ---------------------------------------------------------------------
 * Step definitions are intentionally thin: they translate Gherkin text
 * into calls on LoginPage / InventoryPage methods (via `this.<page>` on
 * the CustomWorld). No locator, no raw Playwright call and no assertion
 * logic lives here — that all belongs in pages/ and utility/.
 */

const config = ConfigReader.getInstance();
const LOGIN_DATA_CSV = 'testdata/loginData.csv';

interface LoginDataRow {
  testCaseId: string;
  username: string;
  password: string;
  expectedInventoryPage: string;
  expectedErrorMessage: string;
}

Given('I am on the SauceDemo login page', async function (this: CustomWorld) {
  await this.loginPage.open();
  expect(await this.loginPage.isLoaded()).toBeTruthy();
});

Given('I am logged in as {string}', async function (this: CustomWorld, username: string) {
  await this.loginPage.open();
  await this.loginPage.login(username, config.get('valid.password'));
  expect(await this.inventoryPage.isLoaded()).toBeTruthy();
});

When('I log in with username {string} and password {string}', async function (
  this: CustomWorld,
  username: string,
  password: string
) {
  await this.loginPage.login(username, password);
});

// Data-driven login: reads username/password for the given test case ID from
// testdata/loginData.csv (utility/DataHandler.ts -> CsvDataReader) rather
// than hard-coding values in the feature file.
When('I log in using test data for test case {string}', async function (this: CustomWorld, testCaseId: string) {
  const row = CsvDataReader.getRowByTestCaseId<LoginDataRow>(LOGIN_DATA_CSV, testCaseId);
  await this.loginPage.login(row.username, row.password);
});

Then('I should be redirected to the inventory page', async function (this: CustomWorld) {
  await this.loginPage.assertRedirectedToInventory();
});

Then('I should see the error message {string}', async function (this: CustomWorld, message: string) {
  await this.loginPage.assertErrorMessageContains(message);
});

Then('the login result should match test case {string} expectations', async function (
  this: CustomWorld,
  testCaseId: string
) {
  const row = CsvDataReader.getRowByTestCaseId<LoginDataRow>(LOGIN_DATA_CSV, testCaseId);
  if (row.expectedInventoryPage === 'true') {
    await this.loginPage.assertRedirectedToInventory();
  } else {
    await this.loginPage.assertErrorMessageContains(row.expectedErrorMessage);
  }
});
