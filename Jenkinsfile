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
  }

  parameters {
    string(
      name: 'TAGS',
      defaultValue: '',
      description: 'Cucumber tag expression to filter scenarios, e.g. "@smoke". Leave blank to run every feature.'
    )
    string(
      name: 'PLAYWRIGHT_IMAGE',
      defaultValue: 'mcr.microsoft.com/playwright:v1.47.0-jammy',
      description: 'Docker image used for the Test stage. Keep the tag in sync with the @playwright/test version in package.json.'
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
          args '-u root:root'
          reuseNode false
        }
      }
      steps {
        unstash 'source'
        sh 'npm ci'
        sh 'npm run typecheck'
        script {
          def tagArgs = params.TAGS?.trim() ? "--tags \"${params.TAGS}\"" : ''
          sh "node scripts/runTests.js ${tagArgs}"
        }
      }
      post {
        always {
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
