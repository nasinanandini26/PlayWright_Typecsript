# Exercises

Two tracks, meant to be done in order:

- **Track A — guided practice modules** (below): one folder per `notes/0X-*.md`
  topic. Each has a `QUESTIONS.md` (concept questions + the coding task), a
  skeleton TypeScript file with `TODO`s marking exactly where to write code, and a
  validation test that automatically checks your implementation — genuinely
  self-checking, no answer key needed.
- **Track B — [Extend the project](EXTEND_THE_PROJECT.md)**: bigger, open-ended
  tasks against the real framework (`pages/`, `features/`, `utility/`, ...). No
  scaffolding, no auto-validation — you check yourself by running `npm test`. Do
  these after Track A.

## Track A — modules

| Module | Topic | Folder | Validate with |
|---|---|---|---|
| 1 | Playwright basics | [`module-01-playwright-basics/`](module-01-playwright-basics/) | `./exercises/run.sh 1` |
| 2 | BDD with Cucumber | [`module-02-bdd-cucumber/`](module-02-bdd-cucumber/) | `./exercises/run.sh 2` |
| 3 | Page Object Model | [`module-03-page-object-model/`](module-03-page-object-model/) | `./exercises/run.sh 3` |
| 4 | Data-driven testing | [`module-04-data-driven-testing/`](module-04-data-driven-testing/) | `./exercises/run.sh 4` |
| 5 | Project configuration | [`module-05-project-configuration/`](module-05-project-configuration/) | `./exercises/run.sh 5` |

For each module:

1. Read the linked `notes/0X-*.md` file.
2. Open that module's `QUESTIONS.md` — it has a few concept questions to think
   through, then the coding task.
3. Open the module's skeleton `.ts` file (under that module's `ts/` folder) and
   fill in every method/function marked `TODO` (each currently `throw`s an `Error`
   as a placeholder — replace the throw with real code). Don't change any exported
   name or function signature, and don't edit the `*.test.ts` file — that's the
   validation.
4. Run it (see below). Keep going until every assertion in that module passes.

## Running an exercise

```bash
# from the project root
./exercises/run.sh 1                 # just module 1
./exercises/run.sh 3 --test-name-pattern "logout"   # extra args pass straight through to `node --test`
./exercises/run.sh all                # every module, in order

# equivalent plain-node form, if you'd rather not use the script
node --require ts-node/register --test exercises/module-01-playwright-basics/ts/PlaywrightBasicsExercise.test.ts
```

Modules 1 and 3 drive a real browser against saucedemo.com and run **headless** by
default (fast, no visible window). Set `HEADLESS=false` if you'd rather watch it:

```bash
HEADLESS=false ./exercises/run.sh 1
```

Modules 2, 4, and 5 are pure TypeScript with no browser, so they run instantly
either way.

Exercises are **not** part of `npm test` (the real Cucumber suite) or
`npm run typecheck` (the real framework's type-check) — they're a separate,
self-contained practice area that reuses this project's `node_modules` and, for
module 3, imports directly from the real `pages/` folder.

## Validations — what "passing" means

Every module's `*.test.ts` is a normal test file using Node's built-in test runner
(`node:test` + `node:assert/strict`) — nothing exotic, no extra dependency. A
failing assertion tells you exactly what's wrong (e.g. *"cart size after add, add,
remove"* expected `1` but got `2`), and an unhandled `Error: TODO: implement ...`
means you haven't replaced that stub yet. Module 3 additionally validates *how* you
wrote the code, not just what it does: it scans your file's source text and fails
the run if any `Locator`-typed field isn't declared `private` — enforcing the Page
Object Model rule from `notes/03-page-object-model.md` automatically instead of
relying on a code-review comment.

None of the `*.test.ts` files should be edited — they're the answer key, just
expressed as assertions instead of a written-out solution.
