import { ShoppingCart } from './ShoppingCart';

/**
 * MODULE 2 — BDD WITH CUCUMBER (step "definitions", no browser, no real Cucumber run)
 * Read notes/02-bdd-cucumber.md first if any of this feels unfamiliar.
 *
 * Imagine this Gherkin scenario — it's what the patterns below must match:
 *
 *   Scenario: Adding and removing items
 *     Given an empty shopping cart
 *     When I add "Sauce Labs Backpack" to the cart
 *     And I add "Sauce Labs Bike Light" to the cart
 *     And I remove "Sauce Labs Backpack" from the cart
 *     Then the cart should contain 1 item
 *
 * QUESTIONS (think through these before/while you code):
 *   1. Why does Cucumber create a brand-new World for every scenario? What would
 *      go wrong if `cart` were declared as a module-level variable instead of an
 *      instance field?
 *   2. What is a Cucumber Expression, and how does `{string}` differ from `{int}`?
 *   3. Why does Cucumber support "item(s)" syntax directly in an expression
 *      instead of you writing two separate step definitions for singular/plural?
 *
 * YOUR TASK
 * A real step-definition file calls Given('pattern', fn) / When('pattern', fn) /
 * Then('pattern', fn) at module load time (see stepDefinitions/inventory.steps.ts
 * in the main project). Testing that registration directly is awkward in
 * isolation, so this exercise splits each step into the two things that matter:
 *   1. its exact Cucumber Expression, as an exported string constant — this is
 *      what a real Given/When/Then call's first argument would be
 *   2. its behaviour, as a method on CartSteps
 * The validation test checks both.
 *
 * Fill in the four pattern constants and four methods below.
 *
 * HOW TO RUN (validates your code)
 *   ./exercises/run.sh 2
 */

// TODO 1: the exact Cucumber Expression for the Given step "an empty shopping cart".
export const GIVEN_EMPTY_CART_PATTERN = 'TODO';

// TODO 2: the exact Cucumber Expression for adding an item, capturing it as {string}.
export const WHEN_ADD_ITEM_PATTERN = 'TODO';

// TODO 3: the exact Cucumber Expression for removing an item, capturing it as {string}.
export const WHEN_REMOVE_ITEM_PATTERN = 'TODO';

// TODO 4: the exact Cucumber Expression for the count assertion. Use Cucumber's
// optional-text syntax (see notes/02-bdd-cucumber.md) so ONE pattern matches both
// "1 item" and "2 items", and capture the count as {int}.
export const THEN_CART_COUNT_PATTERN = 'TODO';

export class CartSteps {
  private readonly cart = new ShoppingCart();

  /** Used by the validation test to inspect final state — don't remove. */
  public getCart(): ShoppingCart {
    return this.cart;
  }

  /**
   * TODO 5: implement the Given step body. A fresh CartSteps already starts with
   * an empty cart, so this can be a no-op — it still needs to exist and do
   * nothing incorrect.
   */
  public givenAnEmptyShoppingCart(): void {
    throw new Error('TODO: implement givenAnEmptyShoppingCart');
  }

  /** TODO 6: add `item` to the cart. */
  public whenIAddItemToTheCart(item: string): void {
    throw new Error('TODO: implement whenIAddItemToTheCart');
  }

  /** TODO 7: remove `item` from the cart. */
  public whenIRemoveItemFromTheCart(item: string): void {
    throw new Error('TODO: implement whenIRemoveItemFromTheCart');
  }

  /**
   * TODO 8: this is a Then step — it must actually assert. Throw an Error (with
   * a helpful message) if `this.cart.size()` doesn't equal `expectedCount`.
   */
  public thenCartShouldContainItems(expectedCount: number): void {
    throw new Error('TODO: implement thenCartShouldContainItems');
  }
}
