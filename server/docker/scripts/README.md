# Docker Scripts

This directory contains operational scripts used by the Docker environment.

These scripts are not part of the Node.js application itself. They are used for operational tasks such as:

- MongoDB backups
- MongoDB restores
- Waiting for MongoDB to become available
- Checking backend application health
- Future automation and CI/CD operations

The scripts are designed to run inside a Linux/Docker environment.

---

## Directory Structure

```text
docker/
└── scripts/
    ├── Dockerfile
    ├── compose.yaml
    ├── backup.sh
    ├── restore.sh
    ├── wait-for-db.sh
    ├── healthcheck.sh
    └── README.md
```

---

## Why Do We Have a Separate Scripts Container?

The application container should primarily run the Node.js application.

We do not want to install operational tools such as `mongosh`, `mongodump`, `mongorestore`, `curl`, `tar`, and `gzip` into the production backend image just because our operational scripts need them.

Instead, we have a separate utility container:

```text
Production Environment
│
├── nginx
│
├── backend
│
├── mongodb
│
└── scripts
      │
      ├── backup.sh
      ├── restore.sh
      ├── wait-for-db.sh
      └── healthcheck.sh
```

This keeps the backend image focused on running the application. The scripts container provides the tools required for operational tasks.

---

## Dockerfile

The scripts Dockerfile is located at:

```text
docker/scripts/Dockerfile
```

It uses:

```dockerfile
FROM mongo:7
```

The MongoDB image is used because it already provides MongoDB utilities such as `mongosh`, `mongodump`, and `mongorestore`.

We additionally install `curl`, `gzip`, and `tar` because our scripts require them.

The image does not automatically perform a backup or restore. Its default command is:

```text
sleep infinity
```

This keeps the utility container available so we can explicitly execute the required script.

---

## Compose File

The scripts Compose file is located at:

```text
docker/scripts/compose.yaml
```

It creates `docker-scripts` as the utility container.

The container is connected to `production-network` so it can communicate with the production MongoDB and backend containers.

The important Docker communication model is:

```text
scripts container
       │
       │ mongodb:27017
       ▼
mongo-prod
```

and:

```text
scripts container
       │
       │ backend:5000
       ▼
backend-prod
```

Docker provides internal DNS for Compose services. Therefore, containers should communicate using service names instead of `localhost`.

---

## Important: `localhost` Inside Containers

Inside a container, `localhost` means **the current container**. It does **NOT** mean another Docker container.

For example, this is **incorrect** when trying to reach MongoDB:

```text
scripts container
       │
       └── localhost:27017
                  ↓
          scripts container
```

Instead, this is **correct**:

```text
scripts container
       │
       └── mongodb:27017
                  ↓
          MongoDB container
```

Likewise, `backend:5000` should be used from another Docker container to reach the backend.

---

## Network

The scripts Compose file uses:

```yaml
networks:
  production-network:
    external: true
```

`external: true` means that this Compose file does not create the network. It expects the network to already exist. This is useful because the production Compose environment already owns the application network.

The intended architecture is:

```text
                    production-network
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      nginx-prod       backend-prod      mongo-prod
                           ▲                ▲
                           │                │
                           └──── scripts ───┘
                              container
```

All containers that need to communicate with each other must be connected to the appropriate Docker network.

---

## Script Overview

```text
backup.sh
    ↓
Creates MongoDB backup

restore.sh
    ↓
Restores MongoDB backup

wait-for-db.sh
    ↓
Waits until MongoDB is reachable

healthcheck.sh
    ↓
Checks whether the backend is ready
```

---

## 1. backup.sh

**File:** `docker/scripts/backup.sh`

**Purpose:** Create a MongoDB backup using `mongodump`.

The backup is first created as a MongoDB dump directory. It is then compressed using `tar` and `gzip`.

**Example final backup:**

```text
/backups/mongodb_2026-08-10_12-30-45.tar.gz
```

### Environment Variables

| Variable     | Default    |
| ------------ | ---------- |
| `MONGO_HOST` | `mongodb`  |
| `MONGO_PORT` | `27017`    |
| `BACKUP_DIR` | `/backups` |

The important part is `MONGO_HOST=mongodb`, because `mongodb` is the Docker service name.

### Backup Flow

```text
MongoDB
   │
   │ mongodump
   ▼
MongoDB dump directory
   │
   │ tar + gzip
   ▼
mongodb_YYYY-MM-DD_HH-MM-SS.tar.gz
```

The timestamp is included in the filename so multiple backups can exist without overwriting each other.

---

## 2. restore.sh

**File:** `docker/scripts/restore.sh`

**Purpose:** Restore a MongoDB database from a backup created by `backup.sh`.

The backup file must be explicitly specified.

**Required variable:**

- `BACKUP_FILE`

**Example:**

```text
BACKUP_FILE=/backups/mongodb_2026-08-10_12-30-45.tar.gz
```

**Optional variables:**

- `MONGO_HOST`
- `MONGO_PORT`
- `BACKUP_DIR`

### Restore Flow

```text
mongodb_YYYY-MM-DD_HH-MM-SS.tar.gz
              │
              │ tar + gzip extraction
              ▼
       MongoDB dump directory
              │
              │ mongorestore
              ▼
           MongoDB
```

### ⚠️ WARNING: Restore Uses `--drop`

The restore command currently uses `--drop`. This tells `mongorestore` to drop an existing collection before restoring it, which **can cause existing data to be removed**.

**DO NOT** blindly run `restore.sh` against a production database. Always verify:

- The backup file.
- The target MongoDB server.
- The database that will be restored.
- That the restore operation is actually intended.

---

## 3. wait-for-db.sh

**File:** `docker/scripts/wait-for-db.sh`

**Purpose:** Wait until MongoDB is actually accepting connections.

Starting a MongoDB container does not necessarily mean MongoDB is immediately ready to accept database connections. For example:

```text
Docker starts MongoDB
       │
       ▼
MongoDB process starts
       │
       ▼
MongoDB initializes
       │
       ▼
MongoDB becomes ready
```

Another container may start before MongoDB reaches the final step. The script solves this by repeatedly executing `db.adminCommand('ping')` until MongoDB responds successfully.

### Environment Variables

| Variable        | Default   |
| --------------- | --------- |
| `MONGO_HOST`    | `mongodb` |
| `MONGO_PORT`    | `27017`   |
| `WAIT_INTERVAL` | `2`       |
| `MAX_ATTEMPTS`  | `30`      |

With the default configuration, `30 attempts × 2 seconds` gives approximately **60 seconds** of maximum waiting time.

### wait-for-db.sh Flow

```text
Start
  │
  ▼
Try MongoDB
  │
  ├── Success ──────► exit 0
  │
  └── Failure
         │
         ▼
      wait 2 sec
         │
         ▼
      try again
         │
         └── maximum attempts
                  │
                  ▼
               exit 1
```

---

## 4. healthcheck.sh

**File:** `docker/scripts/healthcheck.sh`

**Purpose:** Check whether the Node.js backend is ready to serve requests.

The default endpoint is:

```text
http://127.0.0.1:5000/health/ready
```

The script uses `curl` to make the HTTP request.

### Why `/health/ready`?

We have different purposes for health endpoints.

**Basic health** (`/health/`) means the Node.js application is responding.

**Readiness** (`/health/ready`) is intended to indicate that the application and its required dependencies are ready.

```text
/health/
     ↓
Node.js responds

/health/ready
     ↓
Application is ready
+
Required dependencies are available
```

For operational health checking, `/health/ready` is therefore preferred.

### Environment Variables

| Variable              | Default         |
| --------------------- | --------------- |
| `APP_HOST`            | `127.0.0.1`     |
| `APP_PORT`            | `5000`          |
| `HEALTH_PATH`         | `/health/ready` |
| `HEALTHCHECK_TIMEOUT` | `5`             |

### healthcheck.sh Flow

```text
healthcheck.sh
      │
      ▼
HTTP GET /health/ready
      │
      ├── HTTP success ──► exit 0
      │
      └── HTTP failure ──► exit 1
```

The exit code is important for Docker and CI/CD systems.

---

## Exit Codes

Our scripts follow the standard Linux exit-code convention:

- `0` = success
- `1` = failure

For example:

```text
backup.sh
    │
    ├── backup successful
    │       ↓
    │      exit 0
    │
    └── backup failed
            ↓
           exit 1
```

CI/CD systems can use these exit codes to determine whether an operation succeeded.

---

## Backup Storage

The scripts Compose file defines `backup-data` as a Docker named volume.

The container mounts it at `/backups`. Therefore:

```text
scripts container
       │
       ▼
   /backups
       │
       ▼
 backup-data volume
```

The backup files are therefore not part of the Docker image.

### Why Backups Should Not Be Inside the Image

Docker images should contain the application and its required runtime dependencies. They should not contain changing runtime data.

```text
Docker Image
│
├── application code
├── Node.js
└── dependencies
```

Runtime data should be outside the image:

```text
Persistent Storage
│
├── database data
├── uploaded files
└── backups
```

This means a container can be replaced without automatically destroying the persistent data.

---

## Production Backup Architecture

The long-term architecture should be:

```text
                MongoDB
                   │
                   │ mongodump
                   ▼
             backup.sh
                   │
                   ▼
          compressed backup
                   │
                   ▼
        Persistent backup storage
                   │
                   ▼
        External/object storage
```

A Docker volume can provide persistence on a Docker host, but for a real production deployment we should eventually use dedicated persistent/external storage for important backups.

> The Docker volume alone should not be considered a complete disaster-recovery strategy.

---

## Security

Never hard-code production credentials inside these scripts.

**Do NOT do this** inside a committed script:

```text
MONGO_PASSWORD=mypassword
```

Production credentials should be provided through secure environment variables, Docker secrets, or the secret-management system provided by the hosting platform.

**Never commit** `.env` or `.env.*` files containing real production credentials.

---

## Windows Development

The development machine is Windows.

These scripts use `#!/bin/sh` and Linux commands such as `mongodump`, `mongorestore`, `mongosh`, `curl`, `tar`, `gzip`, and `chmod`. Therefore, they are designed to run inside Docker/Linux.

Do not assume that the following will work directly in Windows CMD:

```bash
./backup.sh
```

The recommended approach is to execute these scripts inside the Docker scripts container. This gives the scripts a predictable Linux environment regardless of the host operating system.

### Why Use Docker For The Scripts?

Without the scripts container, the Windows machine would need the correct versions of `mongosh`, `mongodump`, `mongorestore`, `curl`, `tar`, and `gzip`, and their PATH/configuration would need to be correct.

With Docker:

```text
Windows
   │
   ▼
Docker
   │
   ▼
scripts container
   │
   ├── mongosh
   ├── mongodump
   ├── mongorestore
   ├── curl
   ├── tar
   └── gzip
```

The environment is therefore consistent.

---

## Scripts Container

The scripts container is `docker-scripts`. It is a utility container.

It is **NOT** the Node.js backend container. It is **NOT** the MongoDB container.

Its responsibility is only to provide the environment required for operational scripts.

### Container Startup

The scripts container uses `sleep infinity` as its default command.

This means it stays available but does not automatically execute a backup or restore operation. This is intentional.

We do **NOT** want:

```text
Container starts
      │
      ▼
Automatic restore
      │
      ▼
Potential data loss
```

Instead:

```text
Container starts
      │
      ▼
Wait
      │
      ▼
Operator/automation explicitly runs a script
```

---

## Docker Network Communication

The intended production network is `production-network`.

The scripts container connects to the same network. Therefore:

```text
scripts
   │
   ├── mongodb:27017 ──► MongoDB
   │
   └── backend:5000 ───► Backend
```

The exact service names must match the service names in the production Compose configuration.

---

## Relationship With Production Compose

The production environment contains `nginx`, `backend`, and `mongodb`.

The scripts environment adds `scripts`. The resulting architecture is:

```text
                         production-network
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
         nginx-prod        backend-prod        mongo-prod
                                ▲                  ▲
                                │                  │
                                └──── scripts ─────┘
                                   docker-scripts
```

Nginx communicates with the backend. The backend communicates with MongoDB. The scripts container can communicate with MongoDB and the backend when required.

---

## Development vs Production

Our development Docker setup focuses on:

- Hot reload
- Easy debugging
- Fast development
- Bind mounts
- Nodemon

Production focuses on:

- Small images
- Security
- Non-root execution
- No Nodemon
- No polling
- Reproducible builds
- Healthchecks
- Persistent runtime data
- Operational separation

The scripts environment is separate from both because operational tools should not unnecessarily increase the backend image size.

---

## Future CI/CD

These scripts will become useful when GitHub Actions and CI/CD are introduced.

The intended flow is:

```text
Developer
    │
    ▼
Git push
    │
    ▼
GitHub
    │
    ▼
GitHub Actions
    │
    ├── Install dependencies
    ├── Run tests
    ├── Build Docker image
    ├── Run health checks
    └── Deploy
```

The scripts can be called by automation because they return standard exit codes:

- `exit 0` means success.
- `exit 1` means failure.

---

## Portability

The Docker structure is being designed so that the application is not tightly coupled to one hosting provider.

The goal is to keep:

```text
Application
     │
     ▼
Docker Image
     │
     ├── Render
     ├── VPS
     ├── AWS
     ├── Azure
     ├── Google Cloud
     └── Other Docker-compatible platforms
```

Platform-specific configuration should remain separate from the application wherever possible. This will make future deployment changes easier.

---

## Current Scripts

```text
docker/scripts/
│
├── Dockerfile
│   └── Provides MongoDB tools and operational utilities.
│
├── compose.yaml
│   └── Runs the scripts utility container.
│
├── backup.sh
│   └── Creates a MongoDB backup.
│
├── restore.sh
│   └── Restores a MongoDB backup.
│
├── wait-for-db.sh
│   └── Waits until MongoDB is reachable.
│
├── healthcheck.sh
│   └── Checks backend readiness.
│
└── README.md
    └── Documentation for the scripts environment.
```

---

## Important Operational Rules

| Rule | Description                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| 1    | Do not store secrets directly in scripts.                                                                              |
| 2    | Do not commit real `.env` files.                                                                                       |
| 3    | Do not blindly run `restore.sh` against production.                                                                    |
| 4    | Verify the backup before restoring it.                                                                                 |
| 5    | Use Docker service names for container-to-container communication (e.g. `mongodb:27017` instead of `localhost:27017`). |
| 6    | Do not put backups inside Docker images.                                                                               |
| 7    | Important production backups should eventually be stored in persistent external storage.                               |
| 8    | Test backup and restore procedures before depending on them for real disaster recovery.                                |

---

## Testing the Scripts Environment

The following commands can be used to build, start, verify, and test the Docker scripts environment.

All commands below are written as single-line commands so they work properly with Windows Git Bash, CMD, and PowerShell.

The commands assume that the current directory is:

```text
server/
```

---

### 1. Start the Production Environment

Before testing the scripts container, the production services should be running.

Run:

```bash
docker compose -f docker/production/compose.yaml up -d --build
```

**What does this command do?**

| Part                                | Meaning                                          |
| ----------------------------------- | ------------------------------------------------ |
| `docker compose`                    | Runs Docker Compose.                             |
| `-f docker/production/compose.yaml` | Tells Docker which Compose file to use.          |
| `up`                                | Creates and starts the services.                 |
| `-d`                                | Runs the containers in detached/background mode. |
| `--build`                           | Rebuilds images before starting the containers.  |

The production services should include: `nginx`, `backend`, `mongodb`.

---

### 2. Check Production Services

Run:

```bash
docker compose -f docker/production/compose.yaml ps
```

**What does this command do?**

Displays the current status of the services defined in the production Compose file.

Expected result should show the containers running. For example:

```text
NAME           SERVICE   STATUS
backend-prod   backend   Up ... (healthy)
mongo-prod     mongodb   Up ... (healthy)
nginx-prod     nginx     Up ... (healthy)
```

The exact timestamps and status durations will be different.

---

### 3. Check Docker Networks

Run:

```bash
docker network ls
```

**What does this command do?**

Lists all Docker networks available on the machine. We are looking for `production-network`.

Example:

```text
NETWORK ID     NAME                  DRIVER    SCOPE
xxxxxxxxxxxx   production-network   bridge    local
```

Our scripts container must use the same network as the backend and MongoDB containers.

---

### 4. Inspect the Production Network

Run:

```bash
docker network inspect production-network
```

**What does this command do?**

Displays detailed information about the Docker network. It allows us to verify which containers are connected to `production-network`.

The production environment should contain containers such as `backend-prod`, `mongo-prod`, and `nginx-prod`.

After starting the scripts environment, this network should also contain `docker-scripts`.

---

### 5. Build the Scripts Image

Run:

```bash
docker compose -f docker/scripts/compose.yaml build
```

**What does this command do?**

Builds the Docker image defined by `docker/scripts/Dockerfile`.

The image contains: `mongosh`, `mongodump`, `mongorestore`, `curl`, `tar`, `gzip`.

These tools are required by our operational scripts.

Expected result:

```text
Successfully built ...
```

or the equivalent successful Docker Compose build output.

---

### 6. Start the Scripts Container

Run:

```bash
docker compose -f docker/scripts/compose.yaml up -d
```

**What does this command do?**

Creates and starts the scripts utility container. The container name is `docker-scripts`.

The container does not automatically execute a backup or restore. Its default command is `sleep infinity`, so that it remains available for manually executing operational scripts.

---

### 7. Check the Scripts Container

Run:

```bash
docker compose -f docker/scripts/compose.yaml ps
```

**What does this command do?**

Displays the status of the scripts service.

Expected result:

```text
NAME             SERVICE   STATUS
docker-scripts   scripts   Up
```

The exact formatting may differ depending on the Docker Compose version.

---

### 8. Check MongoDB Shell Version

Run:

```bash
docker exec docker-scripts mongosh --version
```

**What does this command do?**

Executes `mongosh` inside the running scripts container. This verifies that the MongoDB shell is available.

Expected result: `2.x.x` — the exact version depends on the MongoDB image version being used.

---

### 9. Check mongodump

Run:

```bash
docker exec docker-scripts mongodump --version
```

**What does this command do?**

Executes `mongodump` inside the scripts container. `mongodump` is the MongoDB utility used to create database backups.

Expected result: `mongodump version: ...` — the exact version depends on the MongoDB image.

---

### 10. Check mongorestore

Run:

```bash
docker exec docker-scripts mongorestore --version
```

**What does this command do?**

Executes `mongorestore` inside the scripts container. `mongorestore` is the MongoDB utility used to restore a MongoDB backup.

Expected result: `mongorestore version: ...` — the exact version depends on the MongoDB image.

---

### 11. Test wait-for-db.sh

Run:

```bash
docker exec docker-scripts ./wait-for-db.sh
```

**What does this command do?**

Executes our MongoDB waiting script inside the scripts container.

The script attempts to connect to `mongodb:27017`. The hostname `mongodb` comes from the Docker Compose service name.

The script sends `db.adminCommand('ping')` to MongoDB.

Expected successful result:

```text
==========================================
Waiting for MongoDB
==========================================
Host     : mongodb
Port     : 27017
Interval : 2s
Attempts : 30
==========================================
MongoDB is available.
Connection successful on attempt 1.
```

The attempt number can be different. For example, MongoDB might require a few attempts before becoming ready:

```text
MongoDB is not ready. Attempt 1/30.
MongoDB is available.
Connection successful on attempt 2.
```

That is also a successful result.

---

### 12. Test healthcheck.sh

Run:

```bash
docker exec docker-scripts ./healthcheck.sh
```

**What does this command do?**

Executes our application healthcheck script inside the scripts container.

The script calls `http://backend:5000/health/ready`. The hostname `backend` is the Docker Compose service name of the backend.

Expected successful result:

```text
==========================================
Application Healthcheck
==========================================
URL: http://backend:5000/health/ready
==========================================
Healthcheck passed.
```

This verifies that the scripts container can communicate with the backend container over the Docker network.

---

### 13. Test the Backup Script

Run:

```bash
docker exec docker-scripts ./backup.sh
```

**What does this command do?**

Executes `backup.sh` inside the scripts container.

The script connects to `mongodb:27017` and uses `mongodump` to create a MongoDB backup.

The backup is then compressed using `tar` and `gzip`. The resulting file is stored inside `/backups`.

Expected output should indicate that the backup was created successfully. The exact output depends on the implementation of `backup.sh`.

---

### 14. Check the Backup Directory

Run:

```bash
docker exec docker-scripts ls -lh /backups
```

**What does this command do?**

Lists the files stored inside `/backups`.

Expected result should contain a backup file similar to:

```text
mongodb_2026-08-10_12-30-45.tar.gz
```

The timestamp will be different for every backup. This confirms that the backup was successfully created.

---

### 15. Verify the Backup Volume

Run:

```bash
docker volume ls
```

**What does this command do?**

Lists Docker-managed volumes. You should find the volume used for `backup-data`.

Depending on the Compose project name, Docker may display the volume with a project prefix. For example:

```text
backend-production_backup-data
```

or another Compose-generated name.

---

### 16. Check the Backup Volume From Inside the Container

Run:

```bash
docker exec docker-scripts ls -lh /backups
```

**What does this command verify?**

It confirms that the backup exists inside the mounted `backup-data` volume.

The important architecture is:

```text
docker-scripts
      │
      ▼
 /backups
      │
      ▼
backup-data
      │
      ▼
Docker-managed persistent storage
```

The backup is therefore not stored inside the temporary container filesystem.

---

### 17. Stop the Scripts Container

Run:

```bash
docker compose -f docker/scripts/compose.yaml down
```

**What does this command do?**

Stops and removes the scripts container and the resources managed by this Compose project.

The named backup volume is not automatically deleted by the normal `down` command. This is important because our backups should survive container replacement.

---

### 18. Start the Scripts Container Again

Run:

```bash
docker compose -f docker/scripts/compose.yaml up -d
```

**What does this command do?**

Creates the scripts container again and starts it.

Because the backup is stored in a named volume, the container can be recreated without automatically losing the backup.

---

### 19. Verify the Previous Backup Still Exists

Run:

```bash
docker exec docker-scripts ls -lh /backups
```

**Expected result**

The backup created before removing the container should still exist. For example:

```text
mongodb_2026-08-10_12-30-45.tar.gz
```

This proves that **Container** and **Persistent Volume** are separate resources.

---

### 20. Check All Production Containers

Run:

```bash
docker compose -f docker/production/compose.yaml ps
```

Expected:

```text
backend-prod    healthy
mongo-prod      healthy
nginx-prod      healthy
```

---

### 21. Check the Scripts Container

Run:

```bash
docker compose -f docker/scripts/compose.yaml ps
```

Expected:

```text
docker-scripts   Up
```

---

### 22. Final Network Verification

Run:

```bash
docker network inspect production-network
```

The network should contain the containers that need to communicate with each other. The expected architecture is:

```text
                    production-network
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      nginx-prod       backend-prod      mongo-prod
                           ▲                ▲
                           │                │
                           └──── scripts ───┘
                              docker-scripts
```

This confirms that the scripts container is using the same Docker network as the production application.

---
