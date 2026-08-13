# Module 5 — Project Configuration

Read `notes/05-project-configuration.md` first.

## Concept questions

1. Look at the real `ConfigReader` in `utility/DataHandler.ts`: does `get(key)`
   support any kind of override today (e.g. an environment variable), or does it
   only ever read `config.properties`? This exercise's `ExerciseConfigReader` adds
   an environment-variable override that the real one doesn't have yet — see
   Track B, task 9 in `exercises/EXTEND_THE_PROJECT.md` for a place that override
   would matter in practice (CI).
2. What command-line workflow does an override-wins order (override checked
   *before* falling back to the file) enable, without editing any config file?
3. Why does `stepDefinitions/hooks.ts` never hardcode a browser name or URL
   itself?

## Coding task

Open `ts/ExerciseConfigReader.ts` and implement `get(key)`, `env()`,
`retryCount()`, and `dryRun()`, following the same *shape* as the real
`ConfigReader` in `utility/DataHandler.ts` — but with one addition: a `get(key)`
that lets a same-named environment variable (`process.env[key]`) win over the
`.properties` file, so behaviour can be overridden per-run without editing a file.

No browser needed — pure TypeScript, fast feedback.

## Run it (this is also your validation)

```bash
./exercises/run.sh 5
# or directly:
node --require ts-node/register --test exercises/module-05-project-configuration/ts/ExerciseConfigReader.test.ts
```

Don't edit `ExerciseConfigReader.test.ts` or `config/exercise.properties`.
