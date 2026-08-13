# 2. BDD with Cucumber

BDD (Behaviour-Driven Development) writes test scenarios in plain language
(**Gherkin**) so a scenario reads like a specification a non-programmer could
review, while still being an executable test. Cucumber is the framework that parses
`.feature` files and calls TypeScript functions ("step definitions" / "glue code")
that match each line.

## Anatomy of a feature file

Open `features/login.feature` alongside this:

```gherkin
@login
Feature: SauceDemo Login          # one feature file per user-facing capability

  Background:                     # steps run before every Scenario in this file
    Given I am on the SauceDemo login page

  @TC_001 @smoke @positive
  Scenario: TC_001 - Successful login with a standard user
    When I log in with username "standard_user" and password "secret_sauce"
    Then I should be redirected to the inventory page
```

- **Given** — sets up state ("I am logged in as...")
- **When** — performs the action under test ("I add X to the cart")
- **Then** — asserts an outcome ("the cart badge should show 1 item")
- **And / But** — continues the previous step's type, purely for readability
- **Background** — Givens shared by every scenario in the file, run before each one
- **Scenario Outline + Examples** — runs the same steps once per data row (this is
  Cucumber's built-in data-driven mechanism — see `notes/04-data-driven-testing.md`)

## Test case IDs and tags

Every `Scenario` in this project carries **both** a `@TC_00N` tag *and* repeats the
ID in its title (`Scenario: TC_001 - ...`). The tag makes a test case filterable
from the command line and visible in CI; the title makes it readable in the HTML
report and in the feature file itself without cross-referencing anything.

```bash
npm test -- --tags "@TC_001"
npm test -- --tags "@smoke"
npm test -- --tags "@TC_001 or @TC_006"
npm test -- --tags "not @negative"
```

## Step definitions ("glue code")

Every step line is matched, at runtime, to a function registered with `Given`,
`When`, or `Then` (imported from `@cucumber/cucumber`) whose **Cucumber
Expression** matches the text. `{string}` captures a quoted value as a `string`
parameter, `{int}` captures a number, and `(s)` marks optional text (so one pattern
matches both "item" and "items") — in argument order:

```ts
// login.feature: When I log in with username "standard_user" and password "secret_sauce"
When('I log in with username {string} and password {string}', async function (
  this: CustomWorld,
  username: string,
  password: string
) {
  await this.loginPage.login(username, password);
});
```

See `stepDefinitions/login.steps.ts` and `stepDefinitions/inventory.steps.ts`.
Cucumber merges step definitions from *every* required file into one shared
registry (see `cucumber.js`'s `--require stepDefinitions/**/*.ts`) — that's why a
`Given` defined in `login.steps.ts` can satisfy a step used as `Background` in
`inventory.feature`, even though `inventory.steps.ts` doesn't define it itself.

> A subtle real bug this project hit: writing `item(s)` **inside a `.feature`
> file's literal step text** does *not* mean "item or items" — optional-text syntax
> only applies to the *step definition's* pattern string. The feature file itself
> must contain one of the literal resulting words ("item" or "items"). Compare
> `features/inventory.feature`'s wording with the `item(s)` pattern in
> `stepDefinitions/inventory.steps.ts` to see the fixed version.

## The World — sharing state within a scenario

`stepDefinitions/world.ts` defines `CustomWorld`, which Cucumber instantiates fresh
for **every scenario** and injects as `this` into every step and hook for that
scenario:

```ts
export class CustomWorld extends World {
  public page!: Page;
  public loginPage!: LoginPage;
  public inventoryPage!: InventoryPage;

  public initializePages(): void {
    this.loginPage = new LoginPage(this.page);
    this.inventoryPage = new InventoryPage(this.page);
  }
}
```

That's how a `Given` step and a later `Then` step within the *same* scenario share
state (e.g. the `Page`, the page-object instances) — via plain fields on `this` —
without any state leaking into the *next* scenario, since the next scenario gets a
brand-new `CustomWorld`.

## Hooks — setup/teardown around each scenario

`stepDefinitions/hooks.ts` uses `BeforeAll`/`AfterAll` (once per run — launch/close
the `Browser`) and `Before`/`After` (once per scenario — open/close a `Context` +
`Page`, and call `this.initializePages()`). It also uses `AfterStep` to attach a
screenshot to the report whenever a step fails — this is Cucumber's equivalent of
`beforeEach`/`afterEach`, but scoped to scenarios and individual steps rather than
plain test functions.

## Running & reports

`npm test` (via `scripts/runTests.js`) runs every `.feature` file, each as its own
`cucumber-js` process, and writes a timestamped HTML+JSON report pair per feature
file under `testreports/html/` and `testreports/json/` — see
`notes/05-project-configuration.md` for exactly how.

## Where to go next

- https://cucumber.io/docs/gherkin/reference/
- https://github.com/cucumber/cucumber-expressions#readme
- Then `notes/03-page-object-model.md` for what `this.loginPage.login(...)` is
  actually calling.
