#!/bin/sh

# ==========================================================
# Docker Health Monitor
# ==========================================================
#
# This script checks whether the backend application and
# MongoDB are reachable from the monitoring container.
#
# Exit codes:
#
#   0 = All checks passed
#   1 = At least one check failed
#
# Why use /bin/sh?
# ----------------
# /bin/sh is available in lightweight Linux containers and
# keeps this script portable across Docker environments.
# ==========================================================


# ----------------------------------------------------------
# Stop immediately if an unexpected command fails.
#
# set -e:
# The shell exits when a command returns a non-zero status.
#
# We still handle the actual health-check failures ourselves
# so that we can display useful information before exiting.
# ----------------------------------------------------------

set -e


# ==========================================================
# Configuration
# ==========================================================

# BACKEND_HOST:
# Docker service/container hostname of the backend.
#
# "backend" is the service name used by Docker Compose.
#
# ${BACKEND_HOST:-backend} means:
#
#   Use BACKEND_HOST if it was provided.
#   Otherwise use "backend".
# ----------------------------------------------------------

BACKEND_HOST="${BACKEND_HOST:-backend}"


# BACKEND_PORT:
# Internal port on which Node.js listens.
#
# This is NOT the host-mapped port.
#
# Container-to-container communication uses the internal
# container port.
# ----------------------------------------------------------

BACKEND_PORT="${BACKEND_PORT:-5000}"


# HEALTH_PATH:
# Backend endpoint used to determine whether the application
# is responding correctly.
# ----------------------------------------------------------

HEALTH_PATH="${HEALTH_PATH:-/health/ready}"


# MONGO_HOST:
# Docker service name of MongoDB.
# ----------------------------------------------------------

MONGO_HOST="${MONGO_HOST:-mongodb}"


# MONGO_PORT:
# MongoDB's internal Docker port.
# ----------------------------------------------------------

MONGO_PORT="${MONGO_PORT:-27017}"


# ==========================================================
# Runtime State
# ==========================================================

# FAILED:
# Keeps track of whether any health check failed.
#
# 0 = no failure
# 1 = at least one failure
# ----------------------------------------------------------

FAILED=0


# ==========================================================
# Header
# ==========================================================

echo "=========================================="
echo "Docker Health Monitor"
echo "=========================================="
echo "Backend : ${BACKEND_HOST}:${BACKEND_PORT}"
echo "Health  : ${HEALTH_PATH}"
echo "MongoDB : ${MONGO_HOST}:${MONGO_PORT}"
echo "=========================================="


# ==========================================================
# Backend Health Check
# ==========================================================

echo ""
echo "Checking backend..."


# ----------------------------------------------------------
# curl:
#
# Makes an HTTP request to the backend.
#
# -f:
# Fail when the server returns an HTTP error status.
#
# -s:
# Silent mode. Do not display curl's progress information.
#
# -S:
# Show errors even though silent mode is enabled.
#
# --max-time 5:
# Give the request a maximum of 5 seconds.
# ----------------------------------------------------------

if curl -fsS --max-time 5 "http://${BACKEND_HOST}:${BACKEND_PORT}${HEALTH_PATH}" > /dev/null; then

    echo "Backend: HEALTHY"

else

    echo "Backend: UNHEALTHY"

    # Mark the overall monitoring result as failed.
    FAILED=1

fi


# ==========================================================
# MongoDB Health Check
# ==========================================================

echo ""
echo "Checking MongoDB..."


# ----------------------------------------------------------
# mongosh:
#
# MongoDB's command-line shell.
#
# --quiet:
# Prevent unnecessary shell output.
#
# --host:
# Specifies the MongoDB hostname.
#
# --port:
# Specifies the MongoDB port.
#
# --eval:
# Executes JavaScript directly without opening an
# interactive shell.
#
# db.adminCommand({ ping: 1 }):
# MongoDB's standard ping command.
#
# A successful ping means MongoDB is responding.
# ----------------------------------------------------------

if mongosh \
    --quiet \
    --host "${MONGO_HOST}" \
    --port "${MONGO_PORT}" \
    --eval "db.adminCommand({ ping: 1 })" > /dev/null; then

    echo "MongoDB: HEALTHY"

else

    echo "MongoDB: UNHEALTHY"

    # Mark the overall monitoring result as failed.
    FAILED=1

fi


# ==========================================================
# Final Result
# ==========================================================

echo ""
echo "=========================================="


# ----------------------------------------------------------
# If FAILED is still 0, every check succeeded.
# ----------------------------------------------------------

if [ "${FAILED}" -eq 0 ]; then

    echo "Overall Status: HEALTHY"
    echo "=========================================="

    # Exit code 0 means success.
    exit 0

fi


# ----------------------------------------------------------
# At least one health check failed.
# ----------------------------------------------------------

echo "Overall Status: UNHEALTHY"
echo "=========================================="

# Exit code 1 means failure.
exit 1