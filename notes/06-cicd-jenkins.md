# 6. CI/CD — Jenkins in the Cloud

This note explains how the framework runs in CI: a **Jenkins** controller
stood up on **AWS** with **Terraform**, which runs the Cucumber/Playwright
suite inside a **Docker** container. Three folders make this up, each a
separate layer:

| Folder / file | Layer | Responsibility |
|---|---|---|
| `terraform/` | Infrastructure | Provision the EC2 VM + networking, and bootstrap Jenkins on it |
| `jenkins/` | Controller image | A Jenkins image that can launch Docker containers + has the right plugins |
| `Jenkinsfile` | Pipeline | The actual build: checkout → test in a container → publish the report |

The guiding idea: the Jenkins **host** only ever needs **Docker**. Everything
Node/Playwright-specific (the right browsers + OS libraries) lives inside a
throwaway container pulled per build, so there is nothing to install or keep
in sync on the VM itself.

---

## Layer 1 — `terraform/` (the AWS infrastructure)

Terraform is *infrastructure as code*: you describe the desired cloud
resources in `.tf` files, and `terraform apply` creates them. Destroy and
recreate the whole stack with one command.

| File | What it declares |
|---|---|
| `versions.tf` | Required Terraform + AWS provider versions, and the `aws` provider (region) |
| `variables.tf` | Inputs you can tune: `aws_region`, `instance_type`, `root_volume_size_gb`, `key_name`, `admin_cidr`, `name_prefix` |
| `main.tf` | The resources: Ubuntu AMI lookup, security group, EC2 instance, Elastic IP |
| `cloud-init.sh.tpl` | A bootstrap script run **once on first boot** of the VM |
| `outputs.tf` | Values printed after apply: Jenkins URL, SSH command, admin-password command |

### What `main.tf` creates

- **`data "aws_ami" "ubuntu"`** — looks up the latest Ubuntu 22.04 image, so
  the AMI ID is never hard-coded.
- **`aws_security_group.jenkins`** — the cloud firewall. Opens inbound **22**
  (SSH) and **8080** (Jenkins UI), both restricted to `var.admin_cidr`.
- **`aws_instance.jenkins`** — the VM itself (`t3.medium`, 30 GiB disk by
  default). Its `user_data` is the rendered cloud-init script.
- **`aws_eip.jenkins`** — a static (Elastic) IP, so the Jenkins URL doesn't
  change if the instance restarts.

### How the `jenkins/` files reach the VM

`main.tf` uses `templatefile()` + `filebase64()` to **embed** this repo's
`jenkins/Dockerfile`, `plugins.txt` and `docker-compose.yml` into the
cloud-init script as base64 blobs:

```hcl
locals {
  user_data = templatefile("${path.module}/cloud-init.sh.tpl", {
    dockerfile_b64 = filebase64("${path.module}/../jenkins/Dockerfile")
    plugins_b64    = filebase64("${path.module}/../jenkins/plugins.txt")
    compose_b64    = filebase64("${path.module}/../jenkins/docker-compose.yml")
  })
}
```

So `terraform apply` is the *only* thing that needs this repo — the VM doesn't
git-clone anything. On first boot, `cloud-init.sh.tpl`:

1. Installs Docker Engine.
2. `base64 -d`s the three embedded files back out to `/opt/jenkins/`.
3. Runs `docker compose up -d --build`, passing `DOCKER_GID` (explained below).

### Running it

```bash
cd terraform
terraform init
terraform apply \
  -var="key_name=<your-existing-EC2-key-pair>" \
  -var="admin_cidr=<your-ip>/32"     # SET THIS — defaults to 0.0.0.0/0 (open to all)
```

> ⚠️ `admin_cidr` defaults to `0.0.0.0/0` (the whole internet) for convenience.
> Always override it with your own IP for anything but a throwaway sandbox.

After apply, `terraform output` prints the Jenkins URL and the command to
fetch the first-login password. Tear it all down with `terraform destroy`.

---

## Layer 2 — `jenkins/` (the controller image)

The official `jenkins/jenkins` image can't do two things this pipeline needs,
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

### `docker-compose.yml` — how the container is run

```yaml
volumes:
  - jenkins_home:/var/jenkins_home          # named volume: jobs/creds survive restarts
  - /var/run/docker.sock:/var/run/docker.sock   # the host's Docker daemon
```

- The **named volume** `jenkins_home` persists everything (jobs, credentials,
  the initial admin password) across `docker compose down`/rebuilds.
- The **socket bind-mount** is what lets Jenkins start sibling containers.

### The `DOCKER_GID` detail (why it exists)

A bind-mounted `/var/run/docker.sock` is owned by the host's `docker` group.
For the non-root `jenkins` user inside the container to use it *without*
running as root, the container must have a group with the **same GID** as the
host's `docker` group, and `jenkins` must be in it. So:

- `docker-compose.yml` passes `DOCKER_GID: ${DOCKER_GID:-999}` as a build arg.
- `cloud-init.sh.tpl` discovers the real value on the host
  (`getent group docker | cut -d: -f3`) and exports it before `docker compose up`.
- `jenkins/Dockerfile` creates/joins that group and adds `jenkins` to it.

This is the usual fix for *"permission denied while trying to connect to the
Docker daemon socket"* in a non-root Jenkins container.

---

## Layer 3 — `Jenkinsfile` (the pipeline)

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
    args '-u root:root'
  }
}
```

Microsoft's official Playwright image already contains the matching browser
builds **and** their Linux dependencies. Keep its tag in sync with
`@playwright/test` in `package.json` (that's what the `PLAYWRIGHT_IMAGE`
parameter is for — bump it when you upgrade Playwright).

### Why `HEADLESS = 'true'`

`config/config.properties` ships `headless=false` (handy for watching tests
run locally), but a CI container has **no display**. Rather than edit the
properties file for CI, the pipeline sets the `HEADLESS` environment variable,
and `ConfigReader` lets any env var override the matching property — see
[§ env overrides](#configreader-env-overrides) below.

### Parameters

- **`TAGS`** — a Cucumber tag expression (e.g. `@smoke`, or `@api`). Blank runs
  every feature. The pipeline forwards it as `--tags "<expr>"`.
- **`PLAYWRIGHT_IMAGE`** — the Docker image for the Test stage.

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
terraform apply
   └─> EC2 (Ubuntu) boots
         └─> cloud-init: install Docker, write jenkins/ files, docker compose up
               └─> Jenkins controller container (has Docker CLI + plugins)
                     │  open http://<elastic-ip>:8080, create a Pipeline job
                     │  "Pipeline script from SCM" -> this repo's Jenkinsfile
                     ▼
               Build runs:
                 Checkout (host)  ─stash source─▶
                 Test (Playwright container): npm ci → typecheck → runTests  [HEADLESS=true]
                   └─stash testreports─▶
                 Publish Report (host): archive + publishHTML  ──▶  "Cucumber BDD Report"
```

## Try it quickly (local, no AWS)

You can run the Jenkins controller locally to see the pipeline work, if you
have Docker:

```bash
cd jenkins
DOCKER_GID=$(getent group docker | cut -d: -f3) docker compose up -d --build
# open http://localhost:8080, unlock with:
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

(On macOS the `docker` group / `getent` trick differs; the Terraform path
targets the Linux EC2 host, where it applies directly.)
