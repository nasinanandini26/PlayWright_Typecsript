# jenkins/Dockerfile
# ---------------------------------------------------------------------
# Jenkins controller image for this project. Extends the official LTS
# image with:
#   - the Docker CLI (so Jenkinsfile's `agent { docker { image ... } }`
#     steps can launch sibling containers against the host's Docker
#     daemon -- the socket is bind-mounted in jenkins/docker-compose.yml,
#     a.k.a. the "Docker outside of Docker" pattern)
#   - the plugin set this repo's Jenkinsfile needs (jenkins/plugins.txt)
#
# Build/run via jenkins/docker-compose.yml, not directly.
FROM jenkins/jenkins:lts-jdk17

USER root

# GID the host's docker.sock appears with inside a container, passed at
# build time so the `jenkins` user can read/write the bind-mounted
# /var/run/docker.sock without chmod-ing it world-writable. Discovered
# automatically by jenkins/docker-compose.yml.
ARG DOCKER_GID=999

# Docker CLI only -- the daemon lives on the host and is reached via the
# bind-mounted /var/run/docker.sock (see docker-compose.yml).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
  && chmod a+r /etc/apt/keyrings/docker.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
     > /etc/apt/sources.list.d/docker.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends docker-ce-cli \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Join (or create) the group that owns the host's docker.sock so `jenkins`
# can use it without running the container as root.
RUN set -eux; \
  existing_group="$(getent group "${DOCKER_GID}" | cut -d: -f1)"; \
  if [ -z "$existing_group" ]; then \
    groupadd -g "${DOCKER_GID}" docker; \
    existing_group=docker; \
  fi; \
  usermod -aG "$existing_group" jenkins

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# No-op unless JENKINS_ADMIN_USER/JENKINS_ADMIN_PASSWORD are set in the
# container env -- see init.groovy.d/basic-security.groovy and
# docker-compose.override.yml, which is what actually sets them.
COPY init.groovy.d /usr/share/jenkins/ref/init.groovy.d

USER jenkins
