# 6. CI/CD — Jenkins (local, via Docker Desktop)

This note explains how the framework runs in CI: a **Jenkins** controller
running locally in **Docker** (Docker Desktop on macOS/Windows, or a native
Docker Engine on Linux), checking out this repo straight from **GitHub** and
running the Cucumber/Playwright suite inside a throwaway container. Two
folders/files make this up:

| Folder / file | Layer | Responsibility |
|---|---|---|
| `jenkins/` | Controller image | A Jenkins image that can launch Docker containers + has the right plugins + a pre-provisioned login |
| `Jenkinsfile` | Pipeline | The actual build: checkout → test in a container → publish the report |

The guiding idea: the Jenkins **host** only ever needs **Docker**. Everything
Node/Playwright-specific (the right browsers + OS libraries) lives inside a
throwaway container pulled per build, so there is nothing to install or keep
in sync on the host itself.

---

## Layer 1 — `jenkins/` (the controller image)

The official `jenkins/jenkins` image can't do three things this setup needs,
so `jenkins/Dockerfile` extends it:

1. **It has no Docker CLI.** The pipeline runs its test stage *inside a
   container*, so Jenkins must be able to talk to a Docker daemon. We install
   just the Docker **CLI** — the daemon lives on the host and is reached
   through the bind-mounted socket (see below). This is the **"Docker outside
   of Docker"** pattern: Jenkins launches *sibling* containers on the host, not
   nested ones.
2. **It needs specific plugins.** `jenkins/plugins.txt` lists them (Docker
   Pipeline, HTML Publisher, Git, Pipeline, Timestamper, Workspace Cleanup,
   Credentials Binding). `jenkins-plugin-cli` installs them at image-build
   time, so the setup wizard needs no manual plugin picking.
3. **It has no login configured.** Fresh Jenkins makes you unlock it with a
   random password buried in a file inside the container. For local dev,
   `jenkins/init.groovy.d/basic-security.groovy` (baked into the image)
   provisions a fixed account instead — see "Skipping the setup wizard" below.

### `docker-compose.yml` — how the container is run

```yaml
volumes:
  - jenkins_home:/var/jenkins_home          # named volume: jobs/creds survive restarts
  - /var/run/docker.sock:/var/run/docker.sock   # the host's Docker daemon
```

- The **named volume** `jenkins_home` persists everything (jobs, credentials)
  across `docker compose down`/rebuilds.
- The **socket bind-mount** is what lets Jenkins start sibling containers.

### The `DOCKER_GID` detail (why it exists)

A bind-mounted `/var/run/docker.sock` is owned by some group. For the
non-root `jenkins` user inside the container to use it *without* running as
root, the container must have a group with the **same GID** that group has,
and `jenkins` must be in it. So:

- `docker-compose.yml` passes `DOCKER_GID: ${DOCKER_GID:-999}` as a build arg.
- You discover the real value by asking a Linux container what GID it sees on
  the mounted socket (see "Running it" below) — that's exactly what the
  Jenkins container will also see, so it's correct whether Docker is native
  (a Linux host) or running inside Docker Desktop's VM (macOS/Windows). On
  Docker Desktop this GID is typically `0` (root), not a real "docker" group —
  `getent group docker` on the host would give the wrong answer (or not even
  run, since macOS's shell has no `getent` at all).
- `jenkins/Dockerfile` creates/joins that group and adds `jenkins` to it.

This is the usual fix for *"permission denied while trying to connect to the
Docker daemon socket"* in a non-root Jenkins container.

### Skipping the setup wizard (`admin`/`admin`, local only)

`jenkins/docker-compose.override.yml` — auto-merged by Compose on top of
`docker-compose.yml` for any plain `docker compose up` run from the
`jenkins/` directory, no extra flag needed — sets:

```yaml
environment:
  - JENKINS_ADMIN_USER=admin
  - JENKINS_ADMIN_PASSWORD=admin
```

`init.groovy.d/basic-security.groovy` is a **no-op unless both env vars are
set**. When they are, it creates that account, locks down anonymous access,
and marks setup as already complete — so Jenkins is reachable and
logged-in-ready as soon as the container reports healthy, no wizard, no
random password to dig out of the container's filesystem.

`admin`/`admin` is intentionally weak — fine for a `localhost`-only
controller you can `docker compose down -v` and recreate at will. Never
reuse this override, or these credentials, anywhere reachable beyond
localhost.

### Running it

```bash
cd jenkins
DOCKER_GID=$(docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  alpine stat -c '%g' /var/run/docker.sock)
docker compose up -d --build
# open http://localhost:8080 — log in with admin / admin
```

Tear it down with `docker compose down` (add `-v` to also wipe
`jenkins_home`, i.e. start over from a completely unconfigured Jenkins).

---

## Layer 2 — `Jenkinsfile` (the pipeline)

A declarative pipeline with `agent none` (each stage picks its own agent).

```
parameters:  TAGS, PLAYWRIGHT_IMAGE
environment: HEADLESS = 'true'
```

| Stage | Agent | What it does |
|---|---|---|
| **Checkout** | `any` | `checkout scm`, then `stash` the source (minus `node_modules`, `testreports`, `.git`) |
| **Test** | `docker { image PLAYWRIGHT_IMAGE }` | `unstash`, `npm ci`, `npm run typecheck`, `node scripts/runTests.js`; `stash` `testreports/` afterward |
| **Publish Report** | `any` | `unstash` reports, copy the latest run to `testreports/latest`, `archiveArtifacts`, `publishHTML` |

### Why a Docker agent for the Test stage

```groovy
agent {
  docker {
    image "${params.PLAYWRIGHT_IMAGE}"   // e.g. mcr.microsoft.com/playwright:v1.47.0-jammy
    args '-u root:root -v playwright-browsers:/ms-playwright'
  }
}
```

Microsoft's official Playwright image already contains matching browser
builds **and** their Linux dependencies. Keep its tag in sync with
`@playwright/test` in `package.json` (that's what the `PLAYWRIGHT_IMAGE`
parameter is for — bump it when you upgrade Playwright).

**Browser caching (`-v playwright-browsers:/ms-playwright`):** `npm ci`'s
postinstall (`playwright install`) only trusts the exact browser revision its
locked `@playwright/test` version needs — if that doesn't match what the
image tag happens to have baked in (common, since `package.json` floats on
`^1.47.0`), it deletes the image's browsers and re-downloads the right ones,
every single build, ~400 MiB over ~2–3 minutes. Mounting a *named Docker
volume* (persists on the host across containers, unlike a container's own
writable layer) over that same path fixes it: the first build downloads once
into the volume, and every build after that finds the revision it needs
already there and skips the download entirely — confirmed in practice
(~3 min → ~30 sec end to end). It only re-downloads again if the required
revision actually changes.

### Why `HEADLESS = 'true'`

`config/config.properties` ships `headless=false` (handy for watching tests
run locally), but a CI container has **no display**. Rather than edit the
properties file for CI, the pipeline sets the `HEADLESS` environment variable,
and `ConfigReader` lets any env var override the matching property — see
[§ env overrides](#configreader-env-overrides) below.

### Parameters

- **`TAGS`** — a dropdown (`choice()`) of the `@tags` actually used across
  `features/*.feature` (`ALL`, `@smoke`, `@api`, ...). `ALL` runs every
  feature; anything else runs only scenarios carrying that tag, forwarded as
  `--tags "<expr>"`.
- **`PLAYWRIGHT_IMAGE`** — the Docker image for the Test stage.
- **`BRANCH_TO_BUILD`** — a *live* dropdown of this repo's actual branches, via
  the **Git Parameter plugin** (`jenkins/plugins.txt`). A plain `choice()`
  would just be a hardcoded list baked into the Jenkinsfile text; `gitParameter`
  instead queries the configured Git SCM's refs each time the build page
  renders:
  ```groovy
  gitParameter(
    name: 'BRANCH_TO_BUILD',
    type: 'PT_BRANCH',
    branchFilter: 'origin/(.*)',
    useRepository: 'https://github.com/nasinanandini26/PlayWright_Typecsript.git',
    defaultValue: 'main',
    sortMode: 'ASCENDING_SMART'
  )
  ```
  It only *takes effect* because the job's Git SCM "Branch Specifier" (a
  setting on the job itself, not in this Jenkinsfile) is `*/${BRANCH_TO_BUILD}`
  — Jenkins resolves that against whichever value you picked before
  checking out. Only a branch that itself contains this `Jenkinsfile` can
  actually build (anything else fails fast with "Unable to find Jenkinsfile
  from git ..." — verified by deliberately picking `main`, which predates
  this CI work).

### Pointing a job at this repo

Create a **Pipeline** job with "Pipeline script from SCM" → Git →
`https://github.com/nasinanandini26/PlayWright_Typecsript.git`, the branch
that has the `Jenkinsfile`, script path `Jenkinsfile`. First build has to run
once before `TAGS`/`PLAYWRIGHT_IMAGE`/`BRANCH_TO_BUILD` show up in the UI —
Jenkins only learns a pipeline's `parameters {}` block by reading the
`Jenkinsfile` from a completed checkout. After that, "Build with Parameters"
lets you pick a tag and (once the SCM's Branch Specifier is switched to
`*/${BRANCH_TO_BUILD}` — see above) a branch too.

### The report

Because each run's report folder is **self-contained** (HTML + JSON +
`screenshots/`, relative paths only — see note 5 / `utility/ReportCollector.ts`),
CI just archives `testreports/**` and points the HTML Publisher at the latest
run. No server needed to view it.

---

## ConfigReader env overrides

The CI story depends on one small framework feature in
`utility/DataHandler.ts`: **any `config.properties` key can be overridden by an
environment variable.** The key is upper-cased with non-alphanumerics turned to
underscores:

| Property | Env var |
|---|---|
| `headless` | `HEADLESS` |
| `slow.mo.millis` | `SLOW_MO_MILLIS` |
| `base.url` | `BASE_URL` |
| `api.base.url` | `API_BASE_URL` |

```ts
private envOverride(key: string): string | undefined {
  const envKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return process.env[envKey];
}
// get()/getOrDefault() consult envOverride(key) before the properties file.
```

This is what lets the `Jenkinsfile` flip the suite to headless (and lets you
point any run at a different URL/credentials) **without touching committed
config** — exactly the "inject via CI env" practice the config file's own
comments call for.

---

## End-to-end flow (one picture)

```
cd jenkins && docker compose up -d --build
   └─> Jenkins controller container boots (Docker CLI + plugins baked in)
         └─> init.groovy.d/basic-security.groovy provisions admin/admin,
             skips the setup wizard (docker-compose.override.yml env vars)
               │  open http://localhost:8080, log in, create a Pipeline job
               │  "Pipeline script from SCM" -> GitHub repo -> Jenkinsfile
               ▼
         Build runs (e.g. "Build with Parameters", TAGS=@smoke):
           Checkout (host)  ─stash source─▶
           Test (Playwright container): npm ci → typecheck → runTests --tags "@smoke"  [HEADLESS=true]
             └─stash testreports─▶
           Publish Report (host): archive + publishHTML  ──▶  "Cucumber BDD Report"
```
