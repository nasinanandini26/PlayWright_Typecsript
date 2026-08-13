# 1. Playwright Basics (TypeScript)

Playwright is a browser automation library: it drives real Chromium, Firefox, and
WebKit engines (not just "Chrome-like" browsers) through one API. In this project it
comes via the `@playwright/test` package — no separate driver binaries to manage
(unlike Selenium's ChromeDriver/geckodriver), because Playwright ships and manages
its own browser builds (`npx playwright install`).

## The object hierarchy

```
chromium/firefox/webkit   (the browser TYPE — picked once via config.properties)
  └─ Browser        (one launched browser instance — created once per run)
       └─ BrowserContext   (an isolated "incognito" session — own cookies/storage)
            └─ Page        (one browser tab)
```

See `stepDefinitions/hooks.ts` — it creates exactly this chain, once per scenario:

```ts
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });   // BeforeAll — once per run
const context = await browser.newContext();                    // Before — once per scenario
const page = await context.newPage();
```

**Why a fresh `BrowserContext` per scenario?** It's the equivalent of a brand-new
incognito window — no leftover cookies or localStorage from a previous scenario can
leak in and cause flaky, order-dependent failures. Reusing one `Browser` across a
whole run while creating a new `Context` per scenario is a common perf/isolation
balance — that's exactly the split between `BeforeAll`/`Before` in `hooks.ts`.

## Locators — the modern way to find elements

Playwright's `Locator` API (as opposed to older-style one-shot `page.$()`) is lazy
and auto-retrying: creating a locator doesn't search the DOM yet, and every action
on it (`.click()`, `.fill()`, `.textContent()`) automatically waits for the element
to exist, be visible, and be actionable before acting — this is *why* Playwright
tests need far fewer explicit `page.waitForTimeout()` calls than older tools.

```ts
const usernameInput: Locator = page.locator('#user-name');
await usernameInput.fill('standard_user');   // waits, then types
```

See `pages/LoginPage.ts` for locators built from SauceDemo's `id`/`data-test`
attributes — prefer stable test hooks like `data-test="..."` over brittle CSS
classes when a site provides them; SauceDemo does, and this project uses them
throughout `pages/`.

## Common actions used in this project

All of these live in **one place**, `utility/CommonActions.ts` — page objects never
call `page.*`/`locator.*` directly, they call `this.actions.*`:

| `CommonActions` method     | What it does                                    |
|-----------------------------|---------------------------------------------------|
| `click(locator)`             | Waits for visible, then clicks                    |
| `enterText(locator, text)`   | Clears + fills a text input                        |
| `typeText(locator, text)`    | Types character-by-character (`pressSequentially`) |
| `selectDropdown(locator, ...)` | Picks a `<select>` option by text/value/index    |
| `hover` / `doubleClick` / `rightClick` / `dragAndDrop` | Mouse actions      |
| `getText` / `getAllTexts`    | Read visible text (one element / all matches)      |
| `isVisible` / `isEnabled`    | Check state without throwing                       |
| `takeScreenshot(name)`       | Saves a timestamped PNG under `testreports/screenshots/` |
| `assertVisible`, `assertText`, `assertContainsText`, `assertAttribute`, `assertUrlContains`, ... | Auto-retrying assertions |

## Assertions

`CommonActions`'s assertion methods wrap `expect` from `@playwright/test` — its
**web-first assertions** auto-retry until the condition becomes true or a timeout
elapses (e.g. `expect(locator).toBeVisible()` polls, it doesn't check once). That's
genuinely useful for flaky-prone conditions like "this toast disappears after 2
seconds." Page objects never call `expect` directly; they expose intent-named
assertion methods (e.g. `LoginPage.assertErrorMessageContains(...)`) that call
`this.actions.assertContainsText(...)` underneath — see `notes/03-page-object-model.md`.

## Where to go next

- Official docs: https://playwright.dev/docs/intro
- Then read `notes/02-bdd-cucumber.md` to see how these Playwright calls get wired
  up behind Gherkin steps.
