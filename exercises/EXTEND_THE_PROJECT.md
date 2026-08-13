# Track B — Extend the Project

This is the second exercise track — see `exercises/README.md` for the overview and
for Track A (the guided, self-checking module exercises with a validation test per
task). These tasks build directly on the working framework (`features/`, `pages/`,
`stepDefinitions/`, `utility/`), in roughly increasing difficulty, and are meant to
come *after* Track A: they assume you're already comfortable with the patterns each
module covers.

Do them in order the first time through — later ones assume you're comfortable with
the patterns from earlier ones. None of these have a solution file, and there's no
per-task validation test: check yourself by running `npm test` and reading the
generated report under `testreports/html/`, and by comparing your new Page Object
methods against the style of the existing ones (private locators, intent-named
methods, everything routed through `CommonActions` — see
`notes/03-page-object-model.md`).

Read the relevant `notes/0X-*.md` file first if a concept feels unfamiliar.

---

## Beginner

**1. Add another test case.**
Add `error_user` (password `secret_sauce`, lands on the inventory page — SauceDemo's
docs list it as a valid-but-quirky account) as a new `@TC_009` scenario in
`features/login.feature`, following the exact tag+title pattern of the existing
scenarios. Run `npm test -- --tags "@TC_009"` and confirm it passes with no
page-object or step-definition changes — this is the point of the framework's
layering: a new *case* is data + Gherkin, not new code.

**2. Read the sort dropdown's current selection.**
`InventoryPage.sortProductsBy(...)` selects a sort option but nothing reads it back.
Add a `getSelectedSortOption(): Promise<string>` method to `InventoryPage` (use
`this.actions.getValue(...)` or read the `<select>`'s displayed text), a step
`Then the selected sort option should be "<expected>"` in `inventory.feature`, and
the matching step definition. Assert it after `TC_008`'s sort action.

---

## Intermediate

**3. Add-then-remove across two products.**
Add a scenario to `inventory.feature` that adds two different products to the cart,
removes one, and asserts the cart badge shows `1` — exercising
`InventoryPage.addProductToCart`/`removeProductFromCart` together without adding any
new page-object code (they already support this; only the feature file and, if
needed, a step definition are new).

**4. A new Page Object from scratch: the cart page.**
On SauceDemo, the cart icon navigates to `/cart.html`, listing added items with
"Remove" buttons and a "Checkout" button. Create `pages/CartPage.ts` following the
existing pattern (`extends BasePage`, private `readonly` locators, methods
delegating to `this.actions`). Give it `getCartItemNames(): Promise<string[]>` and
`removeItem(productName: string): Promise<void>`. Add a `goToCart()` method to
`InventoryPage` that clicks the cart icon and returns a `CartPage`. Write a new
scenario in `inventory.feature` (or a new `cart.feature`) that adds a product,
navigates to the cart, and asserts it appears there.

**5. A second CSV-driven scenario.**
Add `testdata/inventorySortData.csv` with a few rows of
`testCaseId,sortOption,expectedFirstProduct` and a `Scenario Outline` in
`inventory.feature` that sorts by each row's option and asserts the first product
name matches — practicing the `CsvDataReader` style from
`notes/04-data-driven-testing.md` with data outside the login flow.

---

## Advanced

**6. Tag-based test suites.**
Add `@regression` to every scenario across both feature files, in addition to their
existing tags, and add two lines to the README under "Running tests" showing how to
run just smoke tests (`npm test -- --tags "@smoke"`) vs. everything except one slow
scenario you designate (`npm test -- --tags "not @slow"`).

**7. Parallel execution.**
Cucumber's CLI supports `--parallel <n>`. Try
`npm test -- --parallel 2` (you'll need to adjust `scripts/runTests.js` or run
`cucumber-js` directly, since each feature already runs as its own process) and
confirm scenarios *within* a feature genuinely overlap — add a
`console.log(process.pid, ...)` in `stepDefinitions/hooks.ts`'s `Before` hook and
watch multiple process/worker identifiers interleave. If something breaks, the bug
is almost certainly shared mutable state outside `CustomWorld` (module-level
variables in a step-definition file survive across scenarios *and* workers) — find
it before fixing it.

**8. Screenshot every step, not just failures.**
`stepDefinitions/hooks.ts`'s `AfterStep` hook only attaches a screenshot when
`result.status === Status.FAILED`. Add an environment-variable-gated version
(`CAPTURE_EVERY_STEP=true`) that attaches one after *every* step regardless of
outcome, then open an HTML report to see a full visual trace of a scenario. Think
about why this shouldn't be the default — it noticeably slows a full run down.

**9. CI.**
Write a GitHub Actions workflow (`.github/workflows/tests.yml`) that checks out the
repo, sets up Node 20+, runs `npm ci`, `npx playwright install --with-deps`, then
`npm test` (with `headless=true` in `config.properties`, or an override you add for
CI), and uploads `testreports/` as a build artifact. This exercises everything in
`notes/05-project-configuration.md` from a completely clean environment, which is
the real test of whether your configuration is actually complete (nothing
implicitly relying on your local machine's state).
