# Module 4 — Data-Driven Testing

Read `notes/04-data-driven-testing.md` first.

## Concept questions

1. What are the two data-driven testing styles this project demonstrates, and
   when would you reach for each one?
2. Why does the CSV-driven login scenario's `Examples` table hold only a
   `testCaseId` lookup key instead of the actual username/password/expected
   values?
3. What plays the role in a plain-TypeScript loop that a Scenario Outline's
   `Examples:` table plays in Cucumber?

## Coding task

Two small, independent pieces in `ts/`:

1. **`DiscountDataReader.ts`** — implement `readDiscount(code)`, reading
   `testdata/discounts.csv` the same way `utility/DataHandler.ts`'s
   `CsvDataReader` reads `testdata/loginData.csv`, including throwing an `Error`
   whose message contains the code, for an unknown one.
2. **`PriceCalculator.ts`** — implement `applyDiscount(prices, percentOff)`, a
   pure calculation with no file I/O, exercised with several data rows.

No browser needed for this module — both pieces are pure TypeScript, so feedback
is fast.

## Run it (this is also your validation)

```bash
./exercises/run.sh 4
# or directly:
node --require ts-node/register --test exercises/module-04-data-driven-testing/ts/DiscountExercise.test.ts
```

Don't edit `DiscountExercise.test.ts` or `testdata/discounts.csv`.
