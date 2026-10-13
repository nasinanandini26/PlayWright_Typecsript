// Jenkinsfile
// ---------------------------------------------------------------------
// CI pipeline for the Playwright + TypeScript + Cucumber BDD framework.
//
// Design:
//   - "Checkout" runs on the Jenkins controller (needs `git`, which the
//     official jenkins/jenkins image ships with) and stashes the source.
//   - "Test" runs inside Microsoft's official Playwright Docker image, so
//     the Jenkins agent itself never needs Node.js or browsers installed
//     -- only Docker. This is what lets the same Jenkinsfile run on any
//     Docker-capable cloud agent (a single EC2 host, an ECS/Fargate agent,
//     a Kubernetes pod, etc.) with zero extra provisioning.
//   - "Publish Report" copies the latest self-contained HTML report
//     (see scripts/runTests.js) to a fixed path and publishes it via the
//     HTML Publisher plugin, alongside archived raw artifacts.
//
// Requirements on the Jenkins controller/agent that runs the "Test" stage:
//   - Docker CLI + access to a Docker daemon (see jenkins/ for a
//     docker-compose setup that wires this up out of the box).
//   - Docker Pipeline, HTML Publisher plugins (see jenkins/plugins.txt).
pipeline {
  agent none

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    disableConcurrentBuilds()
    // Every stage below picks its own `agent`, which by default re-runs an
    // implicit `checkout scm` on each new node allocation. The "Checkout"
    // stage already does that explicitly and stash/unstash moves files
    // between stages, so the implicit ones are pure waste -- skip them.
    skipDefaultCheckout()
  }

  parameters {
    // Dropdown instead of free text, so "Build with Parameters" lets you just
    // pick a tag. Keep this list in sync with the @tags actually used across
    // features/*.feature. ALL (the default) runs every feature untagged.
    choice(
      name: 'TAGS',
      choices: ['ALL', '@smoke', '@api', '@inventory', '@login', '@guest', '@positive', '@negative', '@datadriven'],
      description: 'Which scenarios to run. ALL runs every feature; any other choice runs only scenarios carrying that tag.'
    )
    string(
      name: 'PLAYWRIGHT_IMAGE',
      defaultValue: 'mcr.microsoft.com/playwright:v1.47.0-jammy',
      description: 'Docker image used for the Test stage. Keep the tag in sync with the @playwright/test version in package.json.'
    )
    // Live dropdown of real branches on the repo (Git Parameter plugin --
    // see jenkins/plugins.txt), not a hardcoded list. Only takes effect
    // because the job's Git SCM "Branch Specifier" is set to */${BRANCH_NAME}
    // -- the checkout happens before Jenkins has even read this Jenkinsfile,
    // so the branch can't be picked from in here alone. Only a branch that
    // itself contains this Jenkinsfile will actually build successfully.
    
    gitParameter(
            name: 'BRANCH_TO_BUILD', 
            type: 'PT_BRANCH', 
            defaultValue: 'main', 
            description: 'Select the GitHub branch to build',
            useRepository: 'https://github.com/nasinanandini26/PlayWright_Typecsript.git',
            sortMode: 'ASCENDING_SMART',
            branchFilter: 'origin/(.*)'
        )
  }

  environment {
    // config/config.properties defaults to headless=false (handy for local
    // debugging); ConfigReader lets env vars override properties, so force
    // headless here -- there is no display in the CI container.
    HEADLESS = 'true'
  }

  stages {
    stage('Checkout') {
      agent any
      steps {
        checkout scm
        stash includes: '**', excludes: 'node_modules/**,testreports/**,.git/**', name: 'source'
      }
    }

    stage('Test') {
      agent {
        docker {
          image "${params.PLAYWRIGHT_IMAGE}"
          // playwright-browsers is a named Docker volume (persists on the
          // Docker host across builds/containers, unlike the container's own
          // writable layer) mounted over /ms-playwright -- the path `npm ci`'s
          // postinstall `playwright install` downloads browsers into. It
          // shadows whatever revisions the image itself baked in there, so
          // the first build populates the volume and every build after that
          // finds the required revision already present and skips the
          // ~400 MiB download entirely. Only re-downloads when the installed
          // @playwright/test version actually needs a different revision.
          args '-u root:root -v playwright-browsers:/ms-playwright'
          reuseNode false
        }
      }
      steps {
        unstash 'source'
        sh 'npm ci'
        sh 'npm run typecheck'
        script {
          def tagArgs = (params.TAGS && params.TAGS != 'ALL') ? "--tags \"${params.TAGS}\"" : ''
          sh "node scripts/runTests.js ${tagArgs}"
        }
      }
      post {
        always {
          // This stage's container runs as root (mcr.microsoft.com/playwright
          // defaults to root regardless of `args` above), so EVERYTHING it
          // writes into the shared workspace -- node_modules, .auth/,
          // testreports/ -- comes out root-owned. That breaks two things run
          // by uid 1000 (the official jenkins/jenkins image's fixed `jenkins`
          // user): the Publish Report stage's unstash of testreports/ (tar
          // extraction restores each file's mtime, which requires owning the
          // file -- "Operation not permitted" even on a world-writable file),
          // and cleanWs()/the next build's workspace wipe, which silently
          // can't delete root-owned files either and leaves them orphaned
          // under playwright-bdd_ws-cleanup_*/ forever. chown the whole
          // workspace back to uid 1000 before this container goes away.
          sh 'chown -R 1000:1000 . || true'
          stash includes: 'testreports/**', name: 'reports', allowEmpty: true
        }
      }
    }

    stage('Publish Report') {
      agent any
      steps {
        unstash 'reports'
        sh '''
          set -e
          mkdir -p testreports
          latest=$(ls -td testreports/*/ 2>/dev/null | head -1 || true)
          rm -rf testreports/latest
          mkdir -p testreports/latest
          if [ -n "$latest" ]; then
            cp -r "$latest"/. testreports/latest/
          fi
        '''
        archiveArtifacts artifacts: 'testreports/**', allowEmptyArchive: true
        publishHTML(target: [
          allowMissing: true,
          alwaysLinkToLastBuild: true,
          keepAll: true,
          reportDir: 'testreports/latest',
          reportFiles: '*.html',
          reportName: 'Cucumber BDD Report'
        ])
      }
      post {
        always {
          cleanWs()
        }
      }
    }
  }
}
