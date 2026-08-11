# ==========================================================
# Docker Image For Operational Scripts
# ==========================================================

# Use the official MongoDB image because it already provides
# MongoDB tools such as:
#
#   mongosh
#   mongodump
#   mongorestore
#
# This saves us from manually installing MongoDB tools.
FROM mongo:7


# ----------------------------------------------------------
# Install additional Linux utilities.
#
# apt-get update
#   Downloads the latest package information from Debian
#   repositories.
#
# apt-get install
#   Installs packages we need.
#
# --no-install-recommends
#   Prevents Debian from installing optional packages that
#   are not required.
#
# rm -rf /var/lib/apt/lists/*
#   Removes downloaded package metadata after installation.
#   This keeps the image smaller.
#
# curl
#   Used by healthcheck.sh to make HTTP requests.
# gzip
#   Used for gzip compression/decompression.
# tar
#   Used to create and extract backup archives.
# ----------------------------------------------------------

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        gzip \
        tar \
    && rm -rf /var/lib/apt/lists/*

# ----------------------------------------------------------
# Set the directory where our scripts will live.
# /scripts is inside the container.
# ----------------------------------------------------------

WORKDIR /scripts

# ----------------------------------------------------------
# Copy our shell scripts into the image.
# The Docker build context will be the project root, so these
# paths are relative to the server/ directory.
# ----------------------------------------------------------

COPY docker/scripts/backup.sh ./backup.sh
COPY docker/scripts/restore.sh ./restore.sh
COPY docker/scripts/wait-for-db.sh ./wait-for-db.sh
COPY docker/scripts/healthcheck.sh ./healthcheck.sh

# ----------------------------------------------------------
# Make all scripts executable.
# chmod = change file permissions.
# +x = add execute permission.
# Without this, running:
#   ./backup.sh
# could result in:
#   Permission denied
# ----------------------------------------------------------

RUN chmod +x \
    backup.sh \
    restore.sh \
    wait-for-db.sh \
    healthcheck.sh

# ----------------------------------------------------------
# Default command.
# We don't automatically execute a backup or restore when the
# container starts.
# sleep infinity keeps the utility container alive so we can
# execute individual scripts when required.
# "sleep" is a Linux command that pauses execution.
# "infinity" tells it to keep waiting indefinitely.
# ----------------------------------------------------------

CMD ["sleep", "infinity"]