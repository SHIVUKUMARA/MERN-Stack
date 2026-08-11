#!/bin/sh

# ==========================================================
# MongoDB Restore Script
# ==========================================================
#
# Purpose:
# Restore a MongoDB database from a backup created by
# backup.sh.
#
# Expected backup format:
#
#     mongodb_YYYY-MM-DD_HH-MM-SS.tar.gz
#
# This script is designed to run inside a Linux/Docker
# environment.
#
# ==========================================================


# ----------------------------------------------------------
# Exit immediately if any command fails.
#
# -e means:
# If any command returns a non-zero exit status, stop the
# script immediately.
#
# We don't want the script to continue after a failed
# extraction or failed MongoDB restore.
# ----------------------------------------------------------

set -e


# ----------------------------------------------------------
# MongoDB connection settings.
#
# ${VARIABLE:-default}
#
# means:
# Use the environment variable if it exists.
# Otherwise use the specified default value.
#
# "mongodb" is our Docker Compose service name.
# Docker's internal DNS allows containers to communicate
# using service names.
# ----------------------------------------------------------

MONGO_HOST="${MONGO_HOST:-mongodb}"

# MongoDB's default port.
MONGO_PORT="${MONGO_PORT:-27017}"


# ----------------------------------------------------------
# Backup directory.
#
# This is where compressed backup files are stored.
# ----------------------------------------------------------

BACKUP_DIR="${BACKUP_DIR:-/backups}"


# ----------------------------------------------------------
# The backup file to restore.
#
# We intentionally don't provide a default backup filename.
#
# The person running the script must explicitly tell the
# script which backup should be restored.
#
# Example:
#
# BACKUP_FILE=/backups/mongodb_2026-08-10_12-30-45.tar.gz
#
# This prevents accidentally restoring the wrong backup.
# ----------------------------------------------------------

BACKUP_FILE="${BACKUP_FILE:-}"


# ----------------------------------------------------------
# Temporary extraction directory.
#
# We extract the compressed backup here before running
# mongorestore.
# ----------------------------------------------------------

RESTORE_DIR="/tmp/mongodb-restore"


# ----------------------------------------------------------
# Make sure a backup file was provided.
#
# -z means:
# "The string has zero length."
#
# If BACKUP_FILE is empty, we stop with an error.
# ----------------------------------------------------------

if [ -z "${BACKUP_FILE}" ]; then
  echo "ERROR: BACKUP_FILE was not provided."
  echo ""
  echo "Example:"
  echo "BACKUP_FILE=/backups/mongodb_2026-08-10_12-30-45.tar.gz"
  echo "export BACKUP_FILE"
  echo "./restore.sh"
  exit 1
fi


# ----------------------------------------------------------
# If the user provides only a filename instead of a complete
# path, place it inside BACKUP_DIR.
#
# Example:
#
# BACKUP_FILE=mongodb_2026-08-10_12-30-45.tar.gz
#
# becomes:
#
# /backups/mongodb_2026-08-10_12-30-45.tar.gz
# ----------------------------------------------------------

case "${BACKUP_FILE}" in
  /*)
    # The path already starts with "/" so it is an absolute
    # path. Keep it unchanged.
    ;;
  *)
    # The path is relative, so place it inside BACKUP_DIR.
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    ;;
esac


# ----------------------------------------------------------
# Check that the backup file actually exists.
#
# -f means:
# "The path exists and is a regular file."
# ----------------------------------------------------------

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file does not exist:"
  echo "${BACKUP_FILE}"
  exit 1
fi


# ----------------------------------------------------------
# Remove an old temporary restore directory if one exists.
#
# -r = recursively remove directories
# -f = force removal without confirmation
# ----------------------------------------------------------

rm -rf "${RESTORE_DIR}"


# ----------------------------------------------------------
# Create a fresh temporary restore directory.
#
# -p = create parent directories when necessary
# ----------------------------------------------------------

mkdir -p "${RESTORE_DIR}"


# ----------------------------------------------------------
# Display restore information.
# ----------------------------------------------------------

echo "=========================================="
echo "MongoDB Restore"
echo "=========================================="
echo "Host   : ${MONGO_HOST}"
echo "Port   : ${MONGO_PORT}"
echo "Backup : ${BACKUP_FILE}"
echo "=========================================="


# ----------------------------------------------------------
# Extract the compressed backup.
#
# tar = Linux archive utility
#
# -x = extract
# -z = decompress gzip
# -f = use the specified archive file
#
# -C tells tar where to extract the archive.
# ----------------------------------------------------------

tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"


# ----------------------------------------------------------
# Find the directory produced by the extraction.
#
# backup.sh creates:
#
# mongodb_2026-08-10_12-30-45/
#
# inside the archive.
#
# We locate that directory so mongorestore receives the
# correct path.
# ----------------------------------------------------------

DUMP_DIR="$(find "${RESTORE_DIR}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"


# ----------------------------------------------------------
# Make sure the extracted MongoDB dump directory exists.
#
# If it doesn't, the backup may be corrupt or have an
# unexpected structure.
# ----------------------------------------------------------

if [ -z "${DUMP_DIR}" ]; then
  echo "ERROR: Could not find MongoDB dump directory."
  rm -rf "${RESTORE_DIR}"
  exit 1
fi


# ----------------------------------------------------------
# Restore the MongoDB dump.
#
# mongorestore = MongoDB's official restore utility.
#
# --host
#   MongoDB server hostname.
#
# --port
#   MongoDB server port.
#
# --drop
#   Drop each existing collection before restoring it.
#
# WARNING:
# --drop can overwrite existing data.
#
# We will NOT use --drop blindly in automated production
# backups. It is included here because this is a restore
# utility and we want the restored database to accurately
# match the backup.
# ----------------------------------------------------------

mongorestore \
  --host="${MONGO_HOST}" \
  --port="${MONGO_PORT}" \
  --drop \
  "${DUMP_DIR}"


# ----------------------------------------------------------
# Remove temporary extracted files.
#
# The original compressed backup remains untouched.
# ----------------------------------------------------------

rm -rf "${RESTORE_DIR}"


# ----------------------------------------------------------
# Restore completed successfully.
# ----------------------------------------------------------

echo "=========================================="
echo "MongoDB restore completed successfully."
echo "=========================================="


# How this actually works
# This is the reverse of backup.sh:

# backup.sh
# MongoDB
#    ↓
# mongodump
#    ↓
# compressed backup

# restore.sh
# backup
#    ↓
# extract
#    ↓
# mongorestore
#    ↓
# MongoDB