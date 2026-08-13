# Module 2 — BDD with Cucumber

Read `notes/02-bdd-cucumber.md` first.

## Concept questions

1. What do `Given`, `When`, and `Then` each conventionally represent in a scenario?
2. Why does Cucumber create a brand-new `CustomWorld` (and thus fresh step-related
   state) for every scenario, rather than reusing one instance across a whole run?
3. What is a Cucumber Expression, and how does `{string}` differ from `{int}`?
4. Why does Cucumber support `item(s)` syntax directly in a pattern instead of you
   writing two separate step definitions for singular and plural?

## Coding task

Open `ts/CartSteps.ts` and:

1. Fill in the four exported Cucumber Expression **pattern constants** at the top
   of the file with the exact string a real `Given('...')`/`When('...')`/`Then('...')`
   call would use to match the example scenario in that file's comment.
2. Implement the four `CartSteps` methods against the provided `ShoppingCart` (see
   `ShoppingCart.ts` — already complete, don't edit it).

No browser or real Cucumber run is needed for this module — the validation test
checks your pattern constants directly and calls your methods in the order a real
scenario would, so feedback is fast.

## Run it (this is also your validation)

```bash
./exercises/run.sh 2
# or directly:
node --require ts-node/register --test exercises/module-02-bdd-cucumber/ts/CartSteps.test.ts
```

Don't edit `CartSteps.test.ts` or `ShoppingCart.ts`.
