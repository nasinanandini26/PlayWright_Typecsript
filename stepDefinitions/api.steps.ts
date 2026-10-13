import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './world';

/**
 * api.steps.ts
 * ---------------------------------------------------------------------
 * Step definitions for @api scenarios. Like the UI steps, these stay thin:
 * they translate Gherkin into calls on the shared ApiActions layer
 * (`this.api()`, see utility/ApiActions.ts), which owns the config-driven
 * base URL and all raw HTTP handling. The response is parked on the World
 * (this.apiResponse) by the When step for the following Then steps to assert.
 */

When('I send a GET request to {string}', async function (this: CustomWorld, endpoint: string) {
  const api = await this.api();
  this.apiResponse = await api.get(endpoint);
});

When(
  'I send a GET request to {string} with query parameter {string} set to {string}',
  async function (this: CustomWorld, endpoint: string, key: string, value: string) {
    const api = await this.api();
    this.apiResponse = await api.get(endpoint, { params: { [key]: value } });
  }
);

When('I send a POST request to {string} with body:', async function (this: CustomWorld, endpoint: string, body: string) {
  const api = await this.api();
  this.apiResponse = await api.post(endpoint, { data: JSON.parse(body) });
});

Then('the API response status should be {int}', async function (this: CustomWorld, expectedStatus: number) {
  const api = await this.api();
  api.assertStatus(this.apiResponse, expectedStatus);
});

Then(
  'the API response JSON field {string} should equal {string}',
  async function (this: CustomWorld, field: string, expected: string) {
    const api = await this.api();
    const body = await api.json<Record<string, unknown>>(this.apiResponse);
    expect(String(body[field]), `JSON field "${field}"`).toBe(expected);
  }
);

Then('the API response JSON array should have {int} items', async function (this: CustomWorld, expectedCount: number) {
  const api = await this.api();
  const body = await api.json<unknown[]>(this.apiResponse);
  expect(Array.isArray(body), 'response body is a JSON array').toBeTruthy();
  expect(body.length, 'JSON array length').toBe(expectedCount);
});
