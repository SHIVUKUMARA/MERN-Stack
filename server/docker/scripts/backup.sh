#!/bin/sh

# ==========================================================
# MongoDB Backup Script
# ==========================================================
#
# Purpose:
# Create a compressed MongoDB backup using mongodump.
# This script is intended to run inside a Linux/Docker
# environment.
# ==========================================================


# ----------------------------------------------------------
# Exit immediately if any command fails.
#
# -e means:
# "If a command returns a non-zero exit status, stop the
# script immediately."
# This prevents the script from continuing after a failed
# backup operation.
# ----------------------------------------------------------
set -e


# ----------------------------------------------------------
# MongoDB connection settings
# These variables can be overridden when the script runs.
# ${MONGO_HOST:-mongodb}
#
# means:
#   Use MONGO_HOST if it exists.
#   Otherwise use "mongodb".
#
# "mongodb" is our Docker Compose service name.
# Docker's internal DNS allows containers to reach the
# MongoDB container using this name.
# ----------------------------------------------------------

MONGO_HOST="${MONGO_HOST:-mongodb}"

# MongoDB default port.
MONGO_PORT="${MONGO_PORT:-27017}"

# ----------------------------------------------------------
# Backup directory
# ${BACKUP_DIR:-/backups}
# means:
#   Use BACKUP_DIR if provided.
#   Otherwise store backups in /backups.
#
# /backups is a directory inside the container/environment
# where this script is executed.
# ----------------------------------------------------------

BACKUP_DIR="${BACKUP_DIR:-/backups}"

# ----------------------------------------------------------
# Create a timestamp.
# date +%Y-%m-%d_%H-%M-%S
# %Y = four-digit year
# %m = month
# %d = day
# %H = hour
# %M = minute
# %S = second
#
# Example:
# 2026-08-10_12-30-45
#
# A timestamp prevents every backup from having the same
# filename.
# ----------------------------------------------------------

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

# ----------------------------------------------------------
# Final backup path.
# Example:
# /backups/mongodb_2026-08-10_12-30-45
# ----------------------------------------------------------

BACKUP_PATH="${BACKUP_DIR}/mongodb_${TIMESTAMP}"

# ----------------------------------------------------------
# Create the backup directory if it doesn't already exist.
# mkdir = create directory
# -p means:
#   Create parent directories if necessary.
#   Do not fail if the directory already exists.
# ----------------------------------------------------------

mkdir -p "${BACKUP_DIR}"

# ----------------------------------------------------------
# Display information so we can see what the script is doing.
# ----------------------------------------------------------
echo "=========================================="
echo "MongoDB Backup"
echo "=========================================="
echo "Host      : ${MONGO_HOST}"
echo "Port      : ${MONGO_PORT}"
echo "Backup to : ${BACKUP_PATH}"
echo "=========================================="

# ----------------------------------------------------------
# Run mongodump.
# mongodump is MongoDB's official backup utility.
# --host
#   Specifies the MongoDB server.
#
# --port
#   Specifies the MongoDB port.
#
# --out
#   Specifies where mongodump should create the backup.
#
# IMPORTANT:
# Authentication options should NOT be hard-coded here.
# When authentication is enabled, we will provide credentials
# through environment variables or another secure mechanism.
# ----------------------------------------------------------

mongodump \
  --host="${MONGO_HOST}" \
  --port="${MONGO_PORT}" \
  --out="${BACKUP_PATH}"

# ----------------------------------------------------------
# Compress the backup.
# tar = archive utility available on Linux.
# -czf:
# -c = create a new archive
# -z = compress using gzip
# -f = specify the archive filename
#
# We first move into BACKUP_DIR using -C so the archive
# contains relative paths rather than the complete filesystem
# path.
# ----------------------------------------------------------

tar -czf "${BACKUP_PATH}.tar.gz" \
  -C "${BACKUP_DIR}" \
  "$(basename "${BACKUP_PATH}")"

# ----------------------------------------------------------
# Remove the uncompressed mongodump directory.
# rm = remove
# -r = recursively remove directories and their contents
# -f = force removal without asking for confirmation
#
# The compressed .tar.gz file is now our final backup.
# ----------------------------------------------------------

rm -rf "${BACKUP_PATH}"

# ----------------------------------------------------------
# Backup completed successfully.
# ----------------------------------------------------------
echo "=========================================="
echo "MongoDB backup completed successfully."
echo "Backup file:"
echo "${BACKUP_PATH}.tar.gz"
echo "=========================================="