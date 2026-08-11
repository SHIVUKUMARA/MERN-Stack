#!/bin/sh

# ==========================================================
# MongoDB Wait Script
# ==========================================================
#
# Purpose:
# Wait until MongoDB is reachable before continuing with
# another command or script.
#
# This is useful when:
#
#   Docker starts MongoDB
#          ↓
#   MongoDB needs time to initialize
#          ↓
#   Another container/script needs MongoDB
#
# Instead of immediately failing, this script waits.
#
# ==========================================================


# ----------------------------------------------------------
# Exit immediately if a command fails.
#
# -e means:
# Stop the script when a command returns a non-zero status.
# ----------------------------------------------------------

set -e


# ----------------------------------------------------------
# MongoDB host.
#
# ${MONGO_HOST:-mongodb}
#
# means:
# Use MONGO_HOST if it was provided.
# Otherwise use "mongodb".
#
# "mongodb" is the Docker Compose service name.
# ----------------------------------------------------------

MONGO_HOST="${MONGO_HOST:-mongodb}"


# ----------------------------------------------------------
# MongoDB port.
#
# MongoDB's default port is 27017.
# ----------------------------------------------------------

MONGO_PORT="${MONGO_PORT:-27017}"


# ----------------------------------------------------------
# Number of seconds to wait between connection attempts.
#
# ${WAIT_INTERVAL:-2}
#
# means:
# Use WAIT_INTERVAL if provided.
# Otherwise wait 2 seconds.
# ----------------------------------------------------------

WAIT_INTERVAL="${WAIT_INTERVAL:-2}"


# ----------------------------------------------------------
# Maximum number of attempts.
#
# ${MAX_ATTEMPTS:-30}
#
# means:
# Try a maximum of 30 times unless another value is
# provided through the environment.
#
# With a 2-second interval:
#
# 30 attempts × 2 seconds = approximately 60 seconds.
# ----------------------------------------------------------

MAX_ATTEMPTS="${MAX_ATTEMPTS:-30}"


# ----------------------------------------------------------
# Current attempt counter.
#
# We start at zero and increase it after every failed
# connection attempt.
# ----------------------------------------------------------

ATTEMPT=0


# ----------------------------------------------------------
# Display information about what we're waiting for.
# ----------------------------------------------------------

echo "=========================================="
echo "Waiting for MongoDB"
echo "=========================================="
echo "Host     : ${MONGO_HOST}"
echo "Port     : ${MONGO_PORT}"
echo "Interval : ${WAIT_INTERVAL}s"
echo "Attempts : ${MAX_ATTEMPTS}"
echo "=========================================="


# ----------------------------------------------------------
# Start the connection loop.
#
# while means:
# Keep executing the commands inside this block while the
# condition remains true.
# ----------------------------------------------------------

while [ "${ATTEMPT}" -lt "${MAX_ATTEMPTS}" ]; do

  # --------------------------------------------------------
  # Increase the attempt counter.
  #
  # $(( ... ))
  #
  # is POSIX shell arithmetic expansion.
  # --------------------------------------------------------

  ATTEMPT=$((ATTEMPT + 1))


  # --------------------------------------------------------
  # Try to connect to MongoDB.
  #
  # mongosh = MongoDB Shell.
  #
  # --host
  #   MongoDB hostname.
  #
  # --port
  #   MongoDB port.
  #
  # --quiet
  #   Suppress unnecessary shell output.
  #
  # --eval
  #   Execute JavaScript directly instead of opening an
  #   interactive MongoDB shell.
  #
  # db.adminCommand('ping')
  #   Sends MongoDB's ping command.
  #
  # If MongoDB responds successfully, mongosh returns
  # exit code 0.
  # --------------------------------------------------------

  if mongosh \
    --host="${MONGO_HOST}" \
    --port="${MONGO_PORT}" \
    --quiet \
    --eval "db.adminCommand('ping')" >/dev/null 2>&1
  then

    # ------------------------------------------------------
    # MongoDB responded successfully.
    #
    # exit 0 means:
    # The script completed successfully.
    # ------------------------------------------------------

    echo "MongoDB is available."
    echo "Connection successful on attempt ${ATTEMPT}."

    exit 0

  fi


  # --------------------------------------------------------
  # MongoDB is not available yet.
  # --------------------------------------------------------

  echo "MongoDB is not ready. Attempt ${ATTEMPT}/${MAX_ATTEMPTS}."


  # --------------------------------------------------------
  # Wait before trying again.
  #
  # sleep = pause execution.
  #
  # ${WAIT_INTERVAL} = number of seconds to wait.
  # --------------------------------------------------------

  sleep "${WAIT_INTERVAL}"

done


# ----------------------------------------------------------
# If we reach this point, every attempt failed.
#
# exit 1 means:
# The script failed.
#
# Docker or another process can then decide what to do with
# the failed operation.
# ----------------------------------------------------------

echo "=========================================="
echo "ERROR: MongoDB did not become available."
echo "=========================================="

exit 1

# How actually it works
# wait-for-db.sh
#       │
#       ▼
# Try MongoDB
#       │
#       ├── Connected ──► exit 0 ✅
#       │
#       └── Failed
#             │
#             ▼
#          wait 2 sec
#             │
#             ▼
#          try again
#             │
#             └── maximum attempts
#                      │
#                      ▼
#                   exit 1 ❌