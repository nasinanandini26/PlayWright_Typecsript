// jenkins/init.groovy.d/basic-security.groovy
// ---------------------------------------------------------------------
// Jenkins core runs every *.groovy script in $JENKINS_HOME/init.groovy.d/
// on every boot. The official jenkins/jenkins image additionally copies
// anything under /usr/share/jenkins/ref/init.groovy.d/ (baked in here by
// jenkins/Dockerfile) into $JENKINS_HOME on first container start.
//
// This script is a no-op unless JENKINS_ADMIN_USER and JENKINS_ADMIN_PASSWORD
// are both set in the container environment. Those are only set by
// jenkins/docker-compose.override.yml, which Docker Compose auto-merges for
// any `docker compose up` run from the jenkins/ directory -- no extra flag
// needed. This script existing in the image does not, by itself, create the
// account; without the override file's env vars it's a no-op and Jenkins
// keeps its normal secure setup wizard (random initial-admin password).
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import hudson.security.HudsonPrivateSecurityRealm
import jenkins.install.InstallState
import jenkins.model.Jenkins

def username = System.getenv('JENKINS_ADMIN_USER')
def password = System.getenv('JENKINS_ADMIN_PASSWORD')

if (!username || !password) {
  return
}

def instance = Jenkins.get()

def realm = new HudsonPrivateSecurityRealm(false)
realm.createAccount(username, password)
instance.setSecurityRealm(realm)

def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(strategy)

// Security is already configured above, so skip the "Unlock Jenkins" +
// setup-wizard screens entirely instead of waiting for a human to click
// through them with the random initialAdminPassword.
instance.setInstallState(InstallState.INITIAL_SETUP_COMPLETED)

instance.save()
