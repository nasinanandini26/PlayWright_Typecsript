# Module 1 — Playwright Basics

Read `notes/01-playwright-basics.md` first.

## Concept questions (answer for yourself, no need to write anything down)

1. What is the object hierarchy from browser type down to `Page`, and which of
   those does `stepDefinitions/hooks.ts` create a *new* one of for every scenario
   versus once for the whole run?
2. What is a `Locator`, and why is creating one (`page.locator(...)`) "lazy" —
   what actually happens the moment you call `.click()` on it?
3. Why do Playwright tests need far fewer `page.waitForTimeout()` calls than
   older tools?
4. Why does this project prefer `id`/`data-test` attributes over CSS classes for
   locators, where the site provides them?

## Coding task

Open `ts/PlaywrightBasicsExercise.ts` and implement the four `TODO` functions
(details are in that file's comments):

1. `fillLoginForm(page, username, password)`
2. `clickLoginButton(page)`
3. `readErrorMessage(page)`
4. `isElementVisible(page, selector)`

## Run it (this is also your validation)

```bash
./exercises/run.sh 1
# or directly:
node --require ts-node/register --test exercises/module-01-playwright-basics/ts/PlaywrightBasicsExercise.test.ts
```

`PlaywrightBasicsExercise.test.ts` drives a real browser against saucedemo.com
using only the functions you write. A failing test names the exact behaviour
that's still wrong or unimplemented — keep re-running until all four tests pass.
Don't edit the test file itself.

Runs **headless** by default. Add `HEADLESS=false` to watch it in a real window:

```bash
HEADLESS=false ./exercises/run.sh 1
```
