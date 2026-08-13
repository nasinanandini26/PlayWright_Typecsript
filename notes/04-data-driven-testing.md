# 4. Data-Driven Testing

Data-driven testing means running the *same* test logic multiple times with
different input values, instead of writing a near-duplicate test per case. This
project demonstrates two styles.

## Style A — Cucumber Scenario Outline + Examples (inline data)

Best for small data sets that belong conceptually to one feature file, or where you
want the exact values visible right in the spec. See `features/inventory.feature`
or the shape (though this project's `login.feature` mostly uses individually
tagged `Scenario`s instead — see the note at the end of this file on why).

```gherkin
Scenario Outline: Login attempts with different accounts
  When I log in with username "<username>" and password "<password>"
  Then I should land on the inventory page: "<landsOnInventory>"

  Examples:
    | username        | password       | landsOnInventory |
    | standard_user    | secret_sauce   | true             |
    | locked_out_user  | secret_sauce   | false            |
```

Cucumber runs the `When`/`Then` steps once per row, substituting `<username>` etc.
into the step text before matching it to a step definition. Each row shows up as
its own scenario in the report — a failure tells you exactly *which* combination
broke, not just "login test failed."

## Style B — External data file (CSV)

Best once a data set is large, shared across scenarios, or you'd rather keep the
feature file focused on *which test cases exist* than on the literal values. See
`features/login.feature`'s `TC_005` scenario + `testdata/loginData.csv`:

```csv
testCaseId,username,password,expectedInventoryPage,expectedErrorMessage
TC_005_01,standard_user,secret_sauce,true,
TC_005_02,performance_glitch_user,secret_sauce,true,
TC_005_03,problem_user,secret_sauce,true,
```

```gherkin
Scenario Outline: TC_005 - Login attempts driven by CSV test data
  When I log in using test data for test case "<testCaseId>"
  Then the login result should match test case "<testCaseId>" expectations

  Examples:
    | testCaseId |
    | TC_005_01  |
    | TC_005_02  |
    | TC_005_03  |
```

Only the *lookup key* (`testCaseId`) is in the `Examples` table — the actual data
lives in the CSV. `utility/DataHandler.ts`'s `CsvDataReader` loads and parses it
(via the `csv-parse` package):

```ts
export class CsvDataReader {
  public static readCsv<T>(relativeOrAbsolutePath: string): T[] { /* ... */ }

  public static getRowByTestCaseId<T extends { testCaseId: string }>(
    relativeOrAbsolutePath: string,
    testCaseId: string
  ): T { /* finds the row, throws a clear error if missing */ }
}
```

and the step definition just asks for a row by id:

```ts
When('I log in using test data for test case {string}', async function (this: CustomWorld, testCaseId: string) {
  const row = CsvDataReader.getRowByTestCaseId<LoginDataRow>(LOGIN_DATA_CSV, testCaseId);
  await this.loginPage.login(row.username, row.password);
});
```

Note the `CsvDataReader.cache` — a CSV file backing many scenarios is parsed from
disk once per run, not once per row, since `readCsv` caches by resolved file path.

## Which style to reach for

| Use Scenario Outline (A) when...                | Use an external CSV (B) when...                  |
|----------------------------------------------------|----------------------------------------------------|
| Data set is small (a handful of rows)               | Data set is large or grows over time                |
| Data is specific to one feature                     | Data is reused across scenarios/features             |
| Each field is a simple scalar                       | Records have several related fields                  |
| You want the values visible right in the feature file (readable spec) | Values are incidental detail, not part of the spec |

Both are "data-driven testing" — the difference is only *where the data lives*, not
whether Cucumber is involved. A JSON file, a database query, or a call to a
test-data API are all drop-in replacements for the CSV file in style B; only
`CsvDataReader` (or a sibling reader) would need to change.

## Why `login.feature`'s main scenarios aren't one big Scenario Outline

TC_001–TC_004 could be collapsed into a single `Scenario Outline` with an `Examples`
table (the way the sibling Java version of this project does it). This project
writes them as separate, individually tagged `@TC_00N` scenarios instead, because
the brief asked for **one test-case-number tag per scenario** — an `Examples` table
row doesn't get its own tag, only the outline as a whole does. `TC_005` still uses
an outline (backed by CSV) to show that style too, once you don't need a distinct
tag per row.

## Where to go next

- `notes/05-project-configuration.md` — how `browser`/`headless`/credentials get
  parameterized the same way, but via `config.properties` + `ConfigReader` instead
  of test data.
