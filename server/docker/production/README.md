# Docker Production Setup

This document explains the production-oriented Docker setup for the Node.js/Express/MongoDB backend.

The goal is not simply to "put the backend inside Docker."

The goal is to create a production-ready container setup that is:

- Secure
- Reproducible
- Portable
- Lightweight
- Easy to test locally
- Suitable for deployment platforms
- Easy to maintain
- Independent from the development environment

---

## Table of Contents

- [1. Development vs Production](#1-development-vs-production)
- [2. Production Architecture](#2-production-architecture)
- [3. Production Docker Structure](#3-production-docker-structure)
- [4. Environment Configuration](#4-environment-configuration)
- [5. Production Dockerfile](#5-production-dockerfile)
- [6. Multi-Stage Build](#6-multi-stage-build)
- [7. Non-Root Container](#7-non-root-container)
- [8. Docker Ignore Rules](#8-docker-ignore-rules)
- [9. Nginx Reverse Proxy](#9-nginx-reverse-proxy)
- [10. Nginx Configuration](#10-nginx-configuration)
- [11. Docker Compose Production](#11-docker-compose-production)
- [12. Backend Service](#12-backend-service)
- [13. Backend Graceful Shutdown](#13-backend-graceful-shutdown)
- [14. MongoDB Service](#14-mongodb-service)
- [15. Persistent Volumes](#15-persistent-volumes)
- [16. MongoDB Health Check](#16-mongodb-health-check)
- [17. Backend Health Check](#17-backend-health-check)
- [18. Application Health Endpoints](#18-application-health-endpoints)
- [19. Nginx Health Check](#19-nginx-health-check)
- [20. Production Networking](#20-production-networking)
- [21. Build the Production Images](#21-build-the-production-images)
- [22. Start the Production Stack](#22-start-the-production-stack)
- [23. Check Container Status](#23-check-container-status)
- [24. Test the Public Health Endpoint](#24-test-the-public-health-endpoint)
- [25. Test the Readiness Endpoint](#25-test-the-readiness-endpoint)
- [26. Verify Backend Is Not Publicly Exposed](#26-verify-backend-is-not-publicly-exposed)
- [27. Test Authentication Through Nginx](#27-test-authentication-through-nginx)
- [28. View Backend Logs](#28-view-backend-logs)
- [29. View Nginx Logs](#29-view-nginx-logs)
- [30. View MongoDB Logs](#30-view-mongodb-logs)
- [31. View Logs for All Services](#31-view-logs-for-all-services)
- [32. Check Docker Networks](#32-check-docker-networks)
- [33. Check Running Containers](#33-check-running-containers)
- [34. Inspect Backend Container](#34-inspect-backend-container)
- [35. Check Backend Image](#35-check-backend-image)
- [36. Stop the Production Stack](#36-stop-the-production-stack)
- [37. Stop and Remove Volumes](#37-stop-and-remove-volumes)
- [38. Rebuild and Start From Scratch](#38-rebuild-and-start-from-scratch)
- [39. Complete Production Test Sequence](#39-complete-production-test-sequence)
- [40. Production Request Flow](#40-production-request-flow)
- [41. Why Nginx Is the Public Entry Point](#41-why-nginx-is-the-public-entry-point)
- [42. Production Image Principles](#42-production-image-principles)
- [43. Development vs Production Container](#43-development-vs-production-container)
- [44. Important Rules](#44-important-rules)
- [45. Current Production Stack](#45-current-production-stack)

---

## 1. Development vs Production

Before writing a single line, let's compare the goals.

| Development              | Production                   |
| ------------------------ | ---------------------------- |
| Fast development         | Performance                  |
| Hot reload               | Stability                    |
| Easy debugging           | Security                     |
| Bind mounts              | Immutable image              |
| Full Node image          | Slim image                   |
| Run as root (acceptable) | Non-root user                |
| Nodemon                  | Node                         |
| Source code mounted      | Source code baked into image |
| Large image acceptable   | Small image preferred        |
| Rebuild rarely           | Deploy anywhere              |

So don't think of the production Dockerfile as "an improved development Dockerfile."

Think of it as a completely different build with different priorities.

---

## 2. Production Architecture

The production setup contains three main containers:

```text
                    Internet
                       │
                       │ :80
                       ▼
                ┌───────────────┐
                │     Nginx     │
                │   nginx-prod  │
                └───────┬───────┘
                        │
                        │ backend:5000
                        ▼
                ┌───────────────┐
                │    Backend    │
                │  backend-prod │
                └───────┬───────┘
                        │
                        │ mongodb:27017
                        ▼
                ┌───────────────┐
                │    MongoDB    │
                │   mongo-prod  │
                └───────────────┘
```

Only Nginx is publicly exposed.

The backend is reachable by Nginx through the Docker network.

MongoDB is reachable by the backend through the Docker network.

---

## 3. Production Docker Structure

The production Docker configuration is kept separate from development and testing.

```text
server/
│
├── docker/
│   │
│   ├── development/
│   │
│   ├── testing/
│   │
│   ├── production/
│   │   │
│   │   ├── Dockerfile
│   │   ├── compose.yaml
│   │   ├── .env
│   │   │
│   │   └── nginx/
│   │       ├── Dockerfile
│   │       ├── nginx.conf
│   │       └── conf.d/
│   │           └── default.conf
│   │
│   ├── scripts/
│   │
│   └── monitoring/
│       ├── grafana/
│       ├── loki/
│       ├── prometheus/
│       ├── health-monitor.sh
│       └── README.md
│
├── .dockerignore
├── .env.example
├── package.json
├── package-lock.json
└── server.js
```

The `monitoring/` directory is reserved for future monitoring/observability work.

It is not required for the current production Docker stack.

---

## 4. Environment Configuration

Production environment variables are kept outside the Docker image.

The production environment file is:

```text
docker/production/.env
```

Example:

```env
NODE_ENV=production
PORT=5000

MONGO_URL=mongodb://mongodb:27017/your_database
```

### Why use `mongodb` instead of `localhost`?

Inside Docker Compose, services communicate using their service names.

Our MongoDB service is:

```yaml
mongodb:
  image: mongo:7
```

Therefore the backend connects to `mongodb:27017`, not `localhost:27017`.

Inside the backend container, `localhost` means **the backend container itself**. It does not mean the MongoDB container.

---

## 5. Production Dockerfile

The production Dockerfile uses a multi-stage build.

```dockerfile
# ==========================================================
# Stage 1 - Install Dependencies
# ==========================================================

FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev


# ==========================================================
# Stage 2 - Runtime Image
# ==========================================================

FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node . .

RUN mkdir -p uploads logs && chown -R node:node uploads logs

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:5000/health/', res => process.exit(res.statusCode === 200 ? 0 : 1)).once('error', () => process.exit(1))"

CMD ["node", "server.js"]
```

---

## 6. Multi-Stage Build

The Dockerfile uses two stages.

### Stage 1

```dockerfile
FROM node:24-bookworm-slim AS dependencies
```

This stage exists to install the production dependencies.

```dockerfile
COPY package*.json ./
```

Only the package files are copied first. This allows Docker to reuse the dependency layer when application source code changes.

Then:

```dockerfile
RUN npm ci --omit=dev
```

installs exactly the dependencies recorded in `package-lock.json`.

### Why `npm ci`?

Development commonly uses `npm install`. Production uses `npm ci`.

| `npm install`                   | `npm ci`                                |
| ------------------------------- | --------------------------------------- |
| Can resolve dependency versions | Uses the existing lock file             |
| Can modify `package-lock.json`  | Designed for reproducible installations |
| Performs dependency resolution  | —                                       |

Production therefore uses `npm ci`.

### Why `--omit=dev`?

Development dependencies such as `nodemon`, `eslint`, `prettier`, and testing tools are not required to run the production application.

Therefore `npm ci --omit=dev` installs only runtime dependencies. This reduces the final image size.

---

## 7. Non-Root Container

The production image uses the `node` user.

```dockerfile
USER node
```

The official Node image already provides a non-root user called `node`.

Running the application as a non-root user follows the principle of least privilege.

Instead of:

```text
Container
   │
   └── root
       └── Node.js
```

we use:

```text
Container
   │
   └── node
       └── Node.js
```

If the application were compromised, the process would not automatically have root privileges inside the container.

Because the application needs to write runtime directories, ownership is explicitly assigned:

```dockerfile
RUN mkdir -p uploads logs && chown -R node:node uploads logs
```

---

## 8. Docker Ignore Rules

The `.dockerignore` file prevents unnecessary files from being copied into the Docker build context.

Important ignored items include:

```text
node_modules

.env
.env.*
!.env.example

logs
uploads

.git
.gitignore

.vscode
.idea

.DS_Store
Thumbs.db

docs
Readme.md

docker/
```

### Why ignore `node_modules`?

The container installs its own dependencies. Host operating-system dependencies should not be copied into the Linux container.

### Why ignore `.env`?

Environment secrets should not be baked into the Docker image. They are supplied at runtime.

### Why ignore `uploads/`?

Uploads are runtime data. They should not become part of the application image.

Production uses a Docker volume:

```yaml
volumes:
  - uploads-data-prod:/app/uploads
```

### Why ignore `.git`?

Git history is not required to run the application. Including it increases the build context unnecessarily.

### Why ignore `docker/`?

The Docker configuration is used to build the image. It is not application runtime code.

---

## 9. Nginx Reverse Proxy

Nginx is used as the public entry point.

```text
Client
  │
  │ HTTP :80
  ▼
Nginx
  │
  │ backend:5000
  ▼
Express
```

The Nginx Dockerfile uses:

```dockerfile
FROM nginx:alpine
```

Alpine provides a lightweight Nginx image.

The official default configuration is removed:

```dockerfile
RUN rm /etc/nginx/conf.d/default.conf
```

Then our configuration is copied:

```dockerfile
COPY docker/production/nginx/nginx.conf /etc/nginx/nginx.conf

COPY docker/production/nginx/conf.d/ /etc/nginx/conf.d/
```

---

## 10. Nginx Configuration

The main configuration is:

```text
docker/production/nginx/nginx.conf
```

### Important Docker logging configuration

```nginx
access_log /dev/stdout main;
error_log /dev/stderr warn;
```

Docker captures `stdout` and `stderr`. Therefore Nginx logs can be viewed using:

```bash
docker compose logs nginx
```

### Request size limit

Nginx limits incoming requests to:

```nginx
client_max_body_size 20M;
```

This is useful because the backend supports file uploads. Nginx can reject an oversized request before it reaches Node.js.

### Security headers

The configuration also includes:

```nginx
server_tokens off;

add_header X-Content-Type-Options "nosniff" always;

add_header X-Frame-Options "SAMEORIGIN" always;

add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

These provide additional browser/security protections and prevent unnecessary Nginx version exposure.

---

## 11. Docker Compose Production

Production is run using:

```text
docker/production/compose.yaml
```

The main services are:

```yaml
services:
  backend: ...

  mongodb: ...

  nginx: ...
```

---

## 12. Backend Service

The backend is built using:

```yaml
build:
  context: ../..
  dockerfile: docker/production/Dockerfile
```

The context is the project root. The production Dockerfile is explicitly selected.

### Backend container name

```yaml
container_name: backend-prod
```

This gives the running container a predictable name.

### Restart policy

```yaml
restart: unless-stopped
```

Docker will restart the container if it stops unexpectedly. It will not restart it if we explicitly stop it.

### Environment file

```yaml
env_file:
  - .env
```

Production environment variables are supplied at runtime. They are not baked into the image.

### Backend port

We intentionally use:

```yaml
expose:
  - "5000"
```

instead of:

```yaml
ports:
  - "5000:5000"
```

`expose` makes the port available to other containers on the Docker network. It does not publish port 5000 to the host.

Therefore:

```text
Host
  │
  └── :5000 → NOT publicly published

Nginx
  │
  └── backend:5000 → AVAILABLE
```

This means clients must go through Nginx.

---

## 13. Backend Graceful Shutdown

The Compose configuration uses:

```yaml
stop_grace_period: 30s
```

This gives the application time to shut down gracefully.

Our Node.js server handles termination signals and closes the MongoDB connection.

The expected shutdown sequence is:

```text
Docker
  │
  │ SIGTERM
  ▼
Node.js
  │
  ├── Stop accepting new work
  │
  ├── Close server
  │
  ├── Close MongoDB connection
  │
  └── Exit
```

This prevents abrupt shutdowns.

---

## 14. MongoDB Service

MongoDB uses the official image:

```yaml
image: mongo:7
```

MongoDB does not publish its port to the host.

The backend communicates with it internally using `mongodb:27017`.

---

## 15. Persistent Volumes

MongoDB uses:

```yaml
volumes:
  - mongo-data-prod:/data/db
```

This keeps database data outside the container filesystem.

If the MongoDB container is removed:

```text
Container removed
       ↓
MongoDB volume remains
       ↓
Database data remains
```

### Upload storage

The backend uses:

```yaml
volumes:
  - uploads-data-prod:/app/uploads
```

Uploaded files therefore survive container replacement.

---

## 16. MongoDB Health Check

MongoDB uses:

```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 20s
```

Docker checks whether MongoDB can respond to `db.adminCommand('ping')`.

The backend waits for MongoDB to become healthy:

```yaml
depends_on:
  mongodb:
    condition: service_healthy
```

Therefore:

```text
MongoDB starts
     ↓
Health check
     ↓
MongoDB healthy
     ↓
Backend starts
```

---

## 17. Backend Health Check

The backend Docker image contains:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:5000/health/', res => process.exit(res.statusCode === 200 ? 0 : 1)).once('error', () => process.exit(1))"
```

The check calls `http://127.0.0.1:5000/health/`.

This checks whether the Node.js application is running.

It does not require `curl` or `wget`. Node's built-in `http` module performs the check.

---

## 18. Application Health Endpoints

The backend provides two important endpoints.

### Server health

```text
GET /health/
```

Checks whether the backend server is running.

Example:

```json
{
  "success": true,
  "message": "Backend server is running successfully",
  "timestamp": "..."
}
```

### Readiness

```text
GET /health/ready
```

Checks whether the backend and its required database are ready.

Example:

```json
{
  "success": true,
  "message": "Backend is ready",
  "database": "connected",
  "timestamp": "..."
}
```

The distinction is:

```text
/health/
    ↓
Is the server alive?

/health/ready
    ↓
Is the server ready to serve requests
with its database available?
```

---

## 19. Nginx Health Check

Nginx currently uses:

```yaml
healthcheck:
  test: ["CMD", "nginx", "-t"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

`nginx -t` validates the Nginx configuration.

This helps detect invalid Nginx configuration before considering the container healthy.

---

## 20. Production Networking

The production services communicate using Docker's internal network.

```text
Nginx
  │
  │ backend:5000
  ▼
Backend
  │
  │ mongodb:27017
  ▼
MongoDB
```

Docker Compose provides DNS resolution using service names. Therefore `backend` and `mongodb` are valid hostnames inside the Compose network.

We do not use `localhost` or `127.0.0.1` for communication between containers.

---

## 21. Build the Production Images

From the project root:

```bash
docker compose -f docker/production/compose.yaml build
```

This builds the backend and Nginx images.

### Clean production build

To completely rebuild without using cached layers:

```bash
docker compose -f docker/production/compose.yaml build --no-cache
```

Use this when you want to verify that the production Dockerfiles work from scratch.

---

## 22. Start the Production Stack

Start all services in detached mode:

```bash
docker compose -f docker/production/compose.yaml up -d
```

`-d` means detached mode — Docker starts the containers in the background.

---

## 23. Check Container Status

Run:

```bash
docker compose -f docker/production/compose.yaml ps
```

Expected result:

```text
NAME           IMAGE                        STATUS
backend-prod   backend-production-backend   Up ... (healthy)
mongo-prod     mongo:7                      Up ... (healthy)
nginx-prod     backend-production-nginx     Up ... (healthy)
```

The exact timestamps and IDs will be different. The important part is:

```text
backend-prod   healthy
mongo-prod     healthy
nginx-prod     healthy
```

---

## 24. Test the Public Health Endpoint

Run:

```bash
curl http://localhost/health/
```

Expected:

```json
{
  "success": true,
  "message": "Backend server is running successfully",
  "timestamp": "..."
}
```

This proves:

```text
Host
 ↓
Nginx
 ↓
Backend
 ↓
Express
```

---

## 25. Test the Readiness Endpoint

Run:

```bash
curl http://localhost/health/ready
```

Expected:

```json
{
  "success": true,
  "message": "Backend is ready",
  "database": "connected",
  "timestamp": "..."
}
```

This proves:

```text
Host
 ↓
Nginx
 ↓
Backend
 ↓
MongoDB
```

---

## 26. Verify Backend Is Not Publicly Exposed

Run:

```bash
curl http://localhost:5000/health/
```

Expected:

```text
curl: (7) Failed to connect to localhost port 5000
```

The exact message may vary by operating system.

This failure is intentional. It proves that port 5000 is not published to the host.

The backend is accessible internally through `backend:5000`, but not directly through `localhost:5000`.

---

## 27. Test Authentication Through Nginx

Use a real test user:

```bash
curl -i -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_REAL_EMAIL","password":"YOUR_REAL_PASSWORD"}'
```

The `-i` option displays HTTP response headers. This is useful because authentication may return cookies such as `Set-Cookie`.

The important thing is that the request reaches the actual authentication service through:

```text
Nginx
 ↓
Backend
 ↓
MongoDB
```

If invalid credentials are supplied, an application-level response such as:

```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": []
}
```

still proves that the request reached the backend authentication logic.

---

## 28. View Backend Logs

Run:

```bash
docker compose -f docker/production/compose.yaml logs backend
```

Follow logs live:

```bash
docker compose -f docker/production/compose.yaml logs -f backend
```

Expected startup output includes:

```text
Database connected

Backend server is running on port : 5000
Environment is : production
```

Application request logs may also appear.

---

## 29. View Nginx Logs

Run:

```bash
docker compose -f docker/production/compose.yaml logs nginx
```

Follow them:

```bash
docker compose -f docker/production/compose.yaml logs -f nginx
```

Nginx writes access logs to `stdout` and errors to `stderr` so Docker can capture them.

---

## 30. View MongoDB Logs

Run:

```bash
docker compose -f docker/production/compose.yaml logs mongodb
```

Follow them:

```bash
docker compose -f docker/production/compose.yaml logs -f mongodb
```

---

## 31. View Logs for All Services

Run:

```bash
docker compose -f docker/production/compose.yaml logs
```

Follow all services:

```bash
docker compose -f docker/production/compose.yaml logs -f
```

---

## 32. Check Docker Networks

Run:

```bash
docker network ls
```

You may see a network created by Compose such as:

```text
backend-production_default
```

The containers communicate through the Compose network. You can inspect it with:

```bash
docker network inspect backend-production_default
```

The exact network name may differ depending on the Compose project name.

---

## 33. Check Running Containers

Run:

```bash
docker ps
```

Expected production containers include `backend-prod`, `mongo-prod`, and `nginx-prod`.

---

## 34. Inspect Backend Container

Run:

```bash
docker inspect backend-prod
```

This shows configuration such as:

- Environment
- Network
- Mounts
- Health status
- Image
- Container configuration

---

## 35. Check Backend Image

List images:

```bash
docker images
```

You should see the production backend image, for example `backend-production-backend`.

The exact image ID and size can vary.

---

## 36. Stop the Production Stack

To stop and remove the containers and Compose network:

```bash
docker compose -f docker/production/compose.yaml down
```

Named volumes are normally preserved. Therefore MongoDB data and uploads remain.

---

## 37. Stop and Remove Volumes

Only use this when you intentionally want to delete persistent data:

```bash
docker compose -f docker/production/compose.yaml down -v
```

### ⚠️ WARNING

`-v` removes the Compose volumes. That means `mongo-data-prod` and `uploads-data-prod` can be deleted.

This can permanently remove your local production-test database and uploaded files.

**Do not use `-v` casually.**

---

## 38. Rebuild and Start From Scratch

For a clean production Docker test:

```bash
docker compose -f docker/production/compose.yaml down

docker compose -f docker/production/compose.yaml build --no-cache

docker compose -f docker/production/compose.yaml up -d
```

Then:

```bash
docker compose -f docker/production/compose.yaml ps
```

Then:

```bash
curl http://localhost/health/
```

Then:

```bash
curl http://localhost/health/ready
```

---

## 39. Complete Production Test Sequence

The following is a useful sequence to run after changing production Docker configuration.

### Step 1 - Stop old containers

```bash
docker compose -f docker/production/compose.yaml down
```

Expected: Containers are stopped and removed.

### Step 2 - Rebuild

```bash
docker compose -f docker/production/compose.yaml build --no-cache
```

Expected: Images build successfully.

### Step 3 - Start

```bash
docker compose -f docker/production/compose.yaml up -d
```

Expected: Containers start in detached mode.

### Step 4 - Check status

```bash
docker compose -f docker/production/compose.yaml ps
```

Expected:

```text
backend-prod   healthy
mongo-prod     healthy
nginx-prod     healthy
```

### Step 5 - Test server health

```bash
curl http://localhost/health/
```

Expected:

```json
{
  "success": true,
  "message": "Backend server is running successfully"
}
```

### Step 6 - Test readiness

```bash
curl http://localhost/health/ready
```

Expected:

```json
{
  "success": true,
  "message": "Backend is ready",
  "database": "connected"
}
```

### Step 7 - Verify backend isolation

```bash
curl http://localhost:5000/health/
```

Expected: `Connection refused / failed to connect`

This is intentional.

### Step 8 - Test an actual API

Example:

```bash
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_REAL_EMAIL","password":"YOUR_REAL_PASSWORD"}'
```

Expected: A response from the actual authentication endpoint.

---

## 40. Production Request Flow

A normal request follows this path:

```text
                    Client
                      │
                      │ HTTP :80
                      ▼
              ┌───────────────┐
              │     Nginx     │
              │   nginx-prod  │
              └───────┬───────┘
                      │
                      │ backend:5000
                      ▼
              ┌───────────────┐
              │    Express    │
              │  backend-prod │
              └───────┬───────┘
                      │
                      │ mongodb:27017
                      ▼
              ┌───────────────┐
              │    MongoDB    │
              │   mongo-prod  │
              └───────────────┘
```

---

## 41. Why Nginx Is the Public Entry Point

We intentionally do not publish `5000` or `27017` to the host.

Only `80` is published.

Therefore:

```text
Internet
   │
   ▼
Nginx :80
   │
   ▼
Backend :5000
   │
   ▼
MongoDB :27017
```

This creates a cleaner boundary between the public network and internal services.

---

## 42. Production Image Principles

The production backend image follows these principles:

### Slim base image

```dockerfile
FROM node:24-bookworm-slim
```

Instead of the larger development image. Benefits:

- Smaller image
- Faster transfer
- Less storage
- Smaller attack surface

### Production dependencies only

```dockerfile
RUN npm ci --omit=dev
```

Development tools are excluded.

### Immutable application image

Application source code is copied into the image:

```dockerfile
COPY --chown=node:node . .
```

The container does not depend on the host source directory.

### Non-root execution

```dockerfile
USER node
```

The application does not run as root.

### Runtime data outside the image

Uploads and database data are stored using Docker volumes. They are not baked into the application image.

---

## 43. Development vs Production Container

### Development

```text
Host source code
      │
      │ bind mount
      ▼
Container
      │
      └── nodemon
             │
             └── watches source changes
```

This is convenient for development.

### Production

```text
Application source
       │
       │ Docker build
       ▼
Immutable image
       │
       ▼
Container
       │
       └── node server.js
```

There is no source-code watcher. There is no bind mount for application code.

---

## 44. Important Rules

| Rule                                                             | Description                                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Do not put secrets inside the Dockerfile                         | Bad: `ENV JWT_SECRET=my-secret`. Instead provide secrets through the deployment environment. |
| Do not copy `.env` into the image                                | Use `.dockerignore` to exclude environment files.                                            |
| Do not expose MongoDB publicly                                   | Avoid `ports: - "27017:27017"` unless there is a specific administrative requirement.        |
| Do not expose the backend publicly when Nginx is the entry point | Use `expose: - "5000"` instead of `ports: - "5000:5000"`.                                    |
| Do not store persistent runtime data inside the image            | Use volumes for MongoDB data and uploads.                                                    |

---

## 45. Current Production Stack

At this stage the production Docker environment contains:

```text
┌─────────────────────────────────────────────┐
│              Docker Compose                 │
│                                             │
│   ┌─────────────┐                           │
│   │    Nginx    │ :80                       │
│   └──────┬──────┘                           │
│          │                                  │
│          ▼                                  │
│   ┌─────────────┐                           │
│   │   Backend   │ :5000                     │
│   └──────┬──────┘                           │
│          │                                  │
│          ▼                                  │
│   ┌─────────────┐                           │
│   │   MongoDB   │ :27017                    │
│   └─────────────┘                           │
│                                             │
│   Volumes:                                  │
│      ├── mongo-data-prod                    │
│      └── uploads-data-prod                  │
│                                             │
└─────────────────────────────────────────────┘
```
