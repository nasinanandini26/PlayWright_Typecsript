# 3. Page Object Model (POM) & OOP in `pages/`

The Page Object Model is a design pattern: **one class per screen (or major
component) of the app, exposing that screen's behaviour as methods — never exposing
raw locators to the tests.**

Without it, step definitions end up full of CSS selectors, and a single HTML change
(say, SauceDemo renames `#login-button` to `#submit-login`) breaks every test file
that clicks the login button. With POM, it breaks one line, in one file.

## Structure in this project

```
pages/
├── BasePage.ts        # abstract superclass — shared constructor + common helpers
├── LoginPage.ts        # https://www.saucedemo.com/  (login form)
└── InventoryPage.ts    # /inventory.html  (product list, sort, cart badge)
```

One class per URL/screen. Compare `pages/LoginPage.ts`:

```ts
export class LoginPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('#user-name');
    // ...
  }

  public async login(username: string, password: string): Promise<void> {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLogin();
  }
}
```

Three POM rules this project follows:

1. **Locators are `private readonly`.** A step definition can call
   `this.loginPage.login(...)` but can never do
   `this.loginPage.usernameInput.fill(...)` — TypeScript's compiler rejects that
   outside the class, so implementation details can't leak back into the test
   layer even by accident.
2. **Methods describe user intent, not mechanics.** `login(username, password)`,
   not `enterUsername()` + `enterPassword()` + `clickLogin()` as three calls the
   *step definition* has to sequence itself. Group steps that are always done
   together into one workflow method — though it's fine (and done here, in
   `LoginPage`) to also expose the atomic steps individually for scenarios that
   need finer control.
3. **All raw interaction goes through `CommonActions`**, not `page.*`/`locator.*`
   directly — see `notes/01-playwright-basics.md`. `BasePage` gives every subclass
   `this.actions` for free.

## Object-oriented concepts, concretely

- **Abstraction** — `BasePage` declares `isLoaded()` and `pageUrl` as `abstract`;
  it says *what* every page must answer without saying *how*:
  ```ts
  export abstract class BasePage {
    public abstract isLoaded(): Promise<boolean>;
    protected abstract get pageUrl(): string;
  }
  ```
- **Inheritance** — `LoginPage` and `InventoryPage extends BasePage`, reusing
  `open()`, `getPageTitle()`, `captureScreenshot()` for free.
- **Polymorphism** — code holding a `BasePage` reference can call `isLoaded()`
  without knowing which concrete page it has; each subclass supplies its own
  meaning of "loaded." `CommonActions.selectDropdown()` is a second example: one
  method, three behaviours, dispatched on which key (`byText`/`byValue`/`byIndex`)
  the caller's object has.
- **Encapsulation** — locators are `private readonly`; the only way to interact
  with them is through the class's own public methods.
- **Composition ("has-a")** — a page object doesn't *extend* Playwright's `Page`;
  it *has a* `CommonActions` instance (built in `BasePage`'s constructor) and
  delegates every interaction to it. This means swapping how a click happens
  (e.g. adding a retry, a log line) touches one file, `utility/CommonActions.ts`,
  never the page classes.

## Where "current state" lives

Page objects don't own the browser — they're constructed with the live
`Page` for the current scenario (see `stepDefinitions/world.ts`'s
`initializePages()`), which itself lives on `CustomWorld` for the duration of one
scenario. A page object is a thin, cheap wrapper around that shared `Page`; only the
wrapper is created fresh, never the underlying browser state.

## A rule of thumb for when to add a new Page Object

If it has its own URL, or is a modal/component with several interactive elements
you'll reuse across scenarios, give it a class. Don't create a Page Object for a
single element you touch once — that's over-engineering for this pattern's benefit
(see Exercise Module 3, which asks you to build exactly this judgment call for
SauceDemo's hamburger menu).

## Where to go next

- `notes/04-data-driven-testing.md` — how the same Page Object methods get called
  many times with different data.
