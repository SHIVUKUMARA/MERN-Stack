#!/bin/sh

# ==========================================================
# Application Healthcheck Script
# ==========================================================
#
# Purpose:
# Check whether the Node.js backend is responding correctly.
#
# This script calls the application's readiness endpoint:
#
#     /health/ready
#
# The readiness endpoint checks:
#
#     Node.js application
#             +
#        MongoDB connection
#
# Therefore, a successful response means the application is
# ready to serve requests.
#
# ==========================================================


# ----------------------------------------------------------
# Exit immediately if a command fails.
#
# -e means:
# Stop the script when an unexpected command fails.
# ----------------------------------------------------------

set -e


# ----------------------------------------------------------
# Application host.
#
# ${APP_HOST:-127.0.0.1}
#
# means:
# Use APP_HOST if it was provided.
# Otherwise use 127.0.0.1.
#
# 127.0.0.1 means "this container/machine".
#
# When this script runs inside the backend container, the
# backend application is available on localhost.
# ----------------------------------------------------------

APP_HOST="${APP_HOST:-127.0.0.1}"


# ----------------------------------------------------------
# Application port.
#
# Your Node.js application currently runs on port 5000.
#
# We use an environment variable so the script can be reused
# if the application port changes later.
# ----------------------------------------------------------

APP_PORT="${APP_PORT:-5000}"


# ----------------------------------------------------------
# Health endpoint.
#
# We use the readiness endpoint instead of the basic
# /health/ endpoint because readiness also checks MongoDB.
#
# The leading "/" is important because this is a URL path.
# ----------------------------------------------------------

HEALTH_PATH="${HEALTH_PATH:-/health/ready}"


# ----------------------------------------------------------
# Maximum number of seconds curl is allowed to wait.
#
# --max-time in curl uses this value.
#
# This prevents the healthcheck from hanging forever if the
# application stops responding.
# ----------------------------------------------------------

TIMEOUT="${HEALTHCHECK_TIMEOUT:-5}"


# ----------------------------------------------------------
# Build the complete healthcheck URL.
#
# Example:
#
# http://127.0.0.1:5000/health/ready
# ----------------------------------------------------------

HEALTH_URL="http://${APP_HOST}:${APP_PORT}${HEALTH_PATH}"


# ----------------------------------------------------------
# Display the URL being checked.
# ----------------------------------------------------------

echo "=========================================="
echo "Application Healthcheck"
echo "=========================================="
echo "URL: ${HEALTH_URL}"
echo "=========================================="


# ----------------------------------------------------------
# Check the application.
#
# curl = command-line HTTP client.
#
# -f / --fail
#   Treat HTTP 4xx and 5xx responses as failures.
#
# -s / --silent
#   Hide normal curl progress/output.
#
# -S / --show-error
#   Show errors even though --silent is enabled.
#
# --max-time
#   Maximum number of seconds curl can wait.
#
# -o /dev/null
#   Throw away the response body because we only need to
#   know whether the request succeeded.
# ----------------------------------------------------------

if curl \
  --fail \
  --silent \
  --show-error \
  --max-time "${TIMEOUT}" \
  -o /dev/null \
  "${HEALTH_URL}"
then

  # --------------------------------------------------------
  # HTTP request succeeded.
  #
  # exit 0 means success.
  # --------------------------------------------------------

  echo "Healthcheck passed."
  exit 0

fi


# ----------------------------------------------------------
# The application did not return a successful response.
#
# exit 1 means failure.
#
# Docker, Compose, CI/CD, or another automation system can
# use this exit code to determine that the application is
# unhealthy.
# ----------------------------------------------------------

echo "Healthcheck failed."
exit 1