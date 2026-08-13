# Module 3 — Page Object Model

Read `notes/03-page-object-model.md` first.

## Concept questions

1. What are the three POM rules this project follows? Give the concrete bug each
   one prevents.
2. Why does a page object never construct its own `Page` (e.g. by launching a
   browser itself), instead always taking one in its constructor?
3. What's the rule of thumb for when something earns its own Page Object class
   versus not?

## Coding task

Open `ts/BurgerMenuPage.ts` and build a Page Object for SauceDemo's hamburger menu
(open it, log out, reset app state, check whether it's open) — details and real
selectors are in that file's comments. Follow the three POM rules; the validation
checks one of them (private locators) automatically by scanning your file's source
text, on top of functional checks against a real browser.

## Run it (this is also your validation)

```bash
./exercises/run.sh 3
# or directly:
node --require ts-node/register --test exercises/module-03-page-object-model/ts/BurgerMenuPage.test.ts
```

Runs **headless** by default — set `HEADLESS=false` to watch it in a real window.
Don't edit `BurgerMenuPage.test.ts`.
