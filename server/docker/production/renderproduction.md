# Render Production Deployment

This document explains how the production Dockerized Node.js/Express backend was deployed to **Render**.

The local production environment and Render production environment use the same production-oriented backend code, but they use different infrastructure for the database and file storage.

---

## Table of Contents

- [1. Production Architecture](#1-production-architecture)
- [2. Local Production vs Render Production](#2-local-production-vs-render-production)
- [3. Project Structure](#3-project-structure)
- [4. GitHub Branch](#4-github-branch)
- [5. External Services](#5-external-services)
  - [MongoDB Atlas](#mongodb-atlas)
  - [Cloudinary](#cloudinary)
- [6. Render Service Configuration](#6-render-service-configuration)
- [7. Root Directory](#7-root-directory)
- [8. Docker Configuration](#8-docker-configuration)
- [9. Port Configuration](#9-port-configuration)
- [10. Environment Variables](#10-environment-variables)
- [11. Render Health Check](#11-render-health-check)
- [12. Application Health Endpoints](#12-application-health-endpoints)
- [13. Deployment Process](#13-deployment-process)
- [14. Deployment Verification](#14-deployment-verification)
- [15. API Testing](#15-api-testing)
- [16. MongoDB Atlas Verification](#16-mongodb-atlas-verification)
- [17. Cloudinary Verification](#17-cloudinary-verification)
- [18. Render Logs](#18-render-logs)
- [19. Important Issue We Found](#19-important-issue-we-found)
- [20. Rate Limiter Fix](#20-rate-limiter-fix)
- [21. Graceful Shutdown](#21-graceful-shutdown)
- [22. Common Render Events](#22-common-render-events)
- [23. Final Production Flow](#24-final-production-flow)

---

## 1. Production Architecture

The application is deployed to Render using the production Docker configuration.

The production architecture is:

```text
                         GitHub
                           │
                           │
                           ▼
                        Render
                           │
                           │
                     Production Docker
                           │
                           ▼
                    Node.js + Express
                      Backend API
                       │       │
                       │       │
                       ▼       ▼
                MongoDB Atlas  Cloudinary
                  Database       Files
```

The application is therefore not dependent on a MongoDB container or local file storage when running on Render.

---

## 2. Local Production vs Render Production

The same backend production code is used in both environments, but the supporting services are different.

| Local Production    | Render Production                 |
| ------------------- | --------------------------------- |
| Docker Compose      | Render                            |
| Backend container   | Backend Docker service            |
| MongoDB container   | MongoDB Atlas                     |
| Local file storage  | Cloudinary                        |
| Nginx reverse proxy | Render handles public HTTP access |
| Docker network      | Render networking                 |
| Local `.env`        | Render Environment Variables      |
| `localhost`         | Public Render URL                 |

The important idea is that the application code remains reusable while the infrastructure changes depending on where the application runs.

---

## 3. Project Structure

The Docker production configuration is inside the `docker` directory.

The relevant structure is:

```text
MERN/
└── server/
    │
    ├── docker/
    │   │
    │   └── production/
    │       │
    │       ├── Dockerfile
    │       ├── compose.yaml
    │       │
    │       └── nginx/
    │           ├── Dockerfile
    │           ├── nginx.conf
    │           │
    │           └── conf.d/
    │               └── default.conf
    │
    ├── config/
    ├── controllers/
    ├── database/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── services/
    ├── utils/
    │
    ├── package.json
    └── ...
```

The Render deployment uses the production Dockerfile:

```text
docker/production/Dockerfile
```

---

## 4. GitHub Branch

The Docker/containerization work was developed in a separate Git branch.

```text
feature/containerization
```

The production Docker and Render deployment changes were pushed to GitHub from this branch.

The relevant deployment commit was:

```text
Configured docker with mongodb atlas, and cloudinary for deployment in render
```

---

## 5. External Services

Render does not run MongoDB or provide permanent application file storage for this application.

Therefore, two external services are used.

### MongoDB Atlas

MongoDB Atlas is used as the production database.

```text
Render Backend
      │
      │ MongoDB connection string
      ▼
MongoDB Atlas
```

The MongoDB connection string is provided through a Render environment variable.

The application does not hard-code the MongoDB connection string.

**Why MongoDB Atlas?**

The local Docker environment can run MongoDB as a container.

For the deployed application, MongoDB Atlas provides the externally hosted MongoDB database.

This means the Render backend can connect to the database without running a MongoDB container inside Render.

### Cloudinary

Cloudinary is used for production file uploads.

```text
Client
   │
   ▼
Render Backend
   │
   ▼
Cloudinary
   │
   ▼
Uploaded File
```

The application already supports multiple storage providers.

For Render production, Cloudinary is selected as the storage provider.

Uploaded files such as avatars are therefore stored in Cloudinary rather than inside the Render container filesystem.

This is important because application container filesystems should not be treated as permanent file storage.

---

## 6. Render Service Configuration

A Render Web Service is used for the backend.

The service is connected to the GitHub repository containing the MERN backend.

The application is deployed using the production Docker configuration.

The important Render settings are:

**Service Type:** Web Service

The service uses the repository containing `MERN/server` and the production Dockerfile located at:

```text
docker/production/Dockerfile
```

---

## 7. Root Directory

The backend is inside:

```text
MERN/server
```

Therefore the Render service uses `server` as its Root Directory.

This is important because the Dockerfile and Node.js application are inside the `server` directory.

The effective structure from Render's point of view is:

```text
server/
├── package.json
├── config/
├── controllers/
├── routes/
├── services/
├── docker/
│   └── production/
│       └── Dockerfile
└── ...
```

The Dockerfile path is:

```text
docker/production/Dockerfile
```

relative to the server directory.

---

## 8. Docker Configuration

Render uses the production Dockerfile:

```text
docker/production/Dockerfile
```

The production Dockerfile is different from a development Dockerfile.

The production image is designed for:

- Smaller image size
- Stability
- Security
- No source-code bind mounts
- No Nodemon
- Production dependencies
- Non-root execution
- Immutable application image

The production application starts using Node.js rather than a development watcher.

---

## 9. Port Configuration

Render provides the port through the `PORT` environment variable.

The backend listens on `process.env.PORT`.

In the Render environment, the application detected:

```text
PORT=10000
```

The Render logs confirmed:

```text
Backend server is running on port : 10000
```

Render also reported:

```text
Detected service running on port 10000
```

This confirms that the application is correctly listening on the port provided by Render.

---

## 10. Environment Variables

Environment-specific configuration is stored in Render Environment Variables.

Sensitive values must not be committed to GitHub.

Examples of production configuration include:

```env
NODE_ENV=production

PORT=10000

MONGO_URL=<MongoDB Atlas connection string>

FILE_STORAGE=cloudinary

CLOUDINARY_CLOUD_NAME=<cloudinary cloud name>
CLOUDINARY_API_KEY=<cloudinary API key>
CLOUDINARY_API_SECRET=<cloudinary API secret>
```

Other application variables such as JWT configuration, frontend URL, upload configuration, and rate-limit configuration are also configured according to the application's existing `.env` structure.

> **Important:** Do not commit `.env` to GitHub. Production secrets belong in Render's Environment Variables.

---

## 11. Render Health Check

Render uses the application's health endpoint to determine whether the service is healthy.

The configured health endpoint is:

```text
/health
```

Render repeatedly requests `GET /health`.

A successful response is `200 OK`. Example:

```json
{
  "success": true,
  "message": "Backend server is running successfully",
  "timestamp": "..."
}
```

The health endpoint should remain lightweight. It should not perform expensive database operations.

---

## 12. Application Health Endpoints

The backend has two separate health endpoints.

### `/health`

**Purpose:** Checks whether the backend server is running.

Request:

```bash
curl https://YOUR-RENDER-URL/health
```

Expected response:

```json
{
  "success": true,
  "message": "Backend server is running successfully",
  "timestamp": "..."
}
```

### `/health/ready`

**Purpose:** Checks whether the backend server and MongoDB are ready.

Request:

```bash
curl https://YOUR-RENDER-URL/health/ready
```

Expected response:

```json
{
  "success": true,
  "message": "Backend is ready",
  "database": "connected",
  "timestamp": "..."
}
```

The difference is:

```text
/health
    ↓
Backend is alive


/health/ready
    ↓
Backend is alive
    +
MongoDB is connected
```

Render uses `/health` because it is intended to be a simple application health check.

---

## 13. Deployment Process

The deployment process is:

```text
1. Make code changes
       ↓
2. Test locally
       ↓
3. Commit changes
       ↓
4. Push to GitHub
       ↓
5. Render detects the new commit
       ↓
6. Render builds the Docker image
       ↓
7. Render starts the container
       ↓
8. Render checks /health
       ↓
9. Application becomes live
```

### Push changes to GitHub

Check the current branch:

```bash
git branch
```

Check the working tree:

```bash
git status
```

Add changes:

```bash
git add .
```

Create a commit:

```bash
git commit -m "your commit message"
```

Push:

```bash
git push
```

Render then detects the new GitHub commit and starts a deployment.

---

## 14. Deployment Verification

After Render finishes the deployment, check the Render logs.

A successful startup looks similar to:

```text
==========================
Database connected
==========================

==========================================
Backend server is running on port : 10000
Environment is : production
==========================================
```

This confirms:

```text
MongoDB connection
       ↓
Successful

Node.js server
       ↓
Started

Environment
       ↓
production

Port
       ↓
Render provided port
```

---

## 15. API Testing

After deployment, test the public Render URL.

Replace `YOUR-RENDER-URL` with the actual Render service URL.

### Test server health

```bash
curl https://YOUR-RENDER-URL/health
```

Expected: `200 OK`

### Test server and database readiness

```bash
curl https://YOUR-RENDER-URL/health/ready
```

Expected: `200 OK` with `"database": "connected"`

### Test authentication

Register:

```text
POST /api/v1/auth/register
```

Login:

```text
POST /api/v1/auth/login
```

Expected successful login: `200 OK`

The backend should return the authentication response according to the application's existing authentication implementation.

### Test authenticated API

Use the authentication token/cookie returned by login and test:

```text
GET /api/v1/users/profile
```

Expected: `200 OK`

### Test logout

```text
POST /api/v1/auth/logout
```

Expected: `200 OK`

---

## 16. MongoDB Atlas Verification

After registering or updating a user through the deployed API:

```text
Render Backend
      │
      ▼
MongoDB Atlas
      │
      ▼
Database
      │
      ▼
Collection
```

Open MongoDB Atlas and verify that the corresponding document exists.

For example, after registration, verify that the user document was created.

This confirms that the Render backend is using MongoDB Atlas rather than a local MongoDB instance.

---

## 17. Cloudinary Verification

Test the avatar upload endpoint:

```text
PATCH /api/v1/users/profile/avatar
```

After a successful upload, the response should contain Cloudinary storage information. For example:

```json
{
  "storage": "cloudinary",
  "url": "...",
  "publicId": "..."
}
```

The important part is `storage = cloudinary`.

The uploaded file should also be visible in the Cloudinary dashboard.

This confirms:

```text
Client
   ↓
Render Backend
   ↓
Cloudinary
```

is working correctly.

---

## 18. Render Logs

Render provides application logs that can be used to verify:

- Application startup
- Database connection
- Incoming requests
- HTTP status codes
- Application errors
- Graceful shutdown
- Health checks

Example:

```text
[INFO] GET /health | 200
```

Example API request:

```text
[INFO] POST /api/v1/auth/login | 200
```

The logs are useful for diagnosing production issues without accessing the container directly.

---

## 19. Important Issue We Found

During the first Render deployment, the application repeatedly appeared to restart.

The logs initially showed:

```text
Received SIGTERM. Starting graceful shutdown...
MongoDB connection closed
Graceful shutdown completed
```

The initial assumption could have been that Render was randomly restarting the service.

The Render Events page provided the actual cause. Render reported:

```text
Instance failed

HTTP health check failed with status code 429
while running your code.
```

This happened repeatedly.

The important status code was `429`, which means **Too Many Requests**.

---

## 20. Rate Limiter Fix

The application had a global API rate limiter:

```js
app.use(apiRateLimit);
```

The rate limiter was therefore also applied to `/health` and `/health/ready`.

Render repeatedly requested `GET /health`. Eventually the API rate limiter returned `429 Too Many Requests`.

Render interpreted this as a failed health check.

The sequence was:

```text
Render
   │
   ▼
GET /health
   │
   ▼
API rate limiter
   │
   ▼
429 Too Many Requests
   │
   ▼
Render health check failed
   │
   ▼
Instance considered unhealthy
   │
   ▼
Instance replaced/restarted
```

This was the actual reason for the repeated shutdown/start behavior.

### Fix

The reusable rate-limit factory was updated to support an optional skip function.

The general API rate limiter now skips `/health` and `/health/ready`.

Conceptually:

```js
skip: (req) => {
  return req.path === "/health" || req.path === "/health/ready";
};
```

Normal API requests remain rate limited. Therefore:

```text
/health
    ↓
Not rate limited


/health/ready
    ↓
Not rate limited


/api/v1/...
    ↓
Rate limited
```

This allows Render to continuously check the service without consuming API rate-limit requests.

---

## 21. Graceful Shutdown

The backend implements graceful shutdown.

When the process receives `SIGTERM`, the application:

1. Stops accepting new work
2. Closes the MongoDB connection
3. Completes shutdown

The logs look like:

```text
Received SIGTERM. Starting graceful shutdown...
MongoDB connection closed
Graceful shutdown completed
```

This is useful during:

- Render deployments
- Container replacement
- Container shutdown
- Infrastructure changes

The shutdown is therefore controlled rather than abruptly terminating the application.

---

## 22. Common Render Events

Render provides useful event messages during deployment and runtime.

### Deploy started

```text
Deploy started
```

This means Render has started building/deploying the new version.

### Deploy live

```text
Deploy live
```

This means the deployment successfully became active.

### Health check failed

```text
HTTP health check failed with status code 429
```

This means Render's health request received an unsuccessful response.

The application's health endpoint should therefore be checked first.

### Application exited early

```text
Application exited early while running your code.
```

This means the application process exited unexpectedly.

Check the instance logs around the reported time for the actual Node.js error.

### Service recovered

```text
Service recovered
```

Recently failed instances are now reporting healthy.

This means Render has detected that the service is healthy again.

---

## 23. Final Production Flow

The final deployment architecture is:

```text
                         GitHub
                           │
                           │
                           ▼
                         Render
                           │
                           │
                  Production Docker
                           │
                           ▼
                  Node.js + Express
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
          MongoDB       Cloudinary     Health
           Atlas         Storage       Checks
             │             │             │
             │             │             │
             ▼             ▼             ▼
          Database        Files       /health
                                      /health/ready
```

The request flow is:

```text
Client
  │
  ▼
Render
  │
  ▼
Node.js + Express
  │
  ├── Authentication
  │
  ├── Users
  │
  ├── Other APIs
  │
  ├── MongoDB Atlas
  │
  └── Cloudinary
```

### Final Result

The backend is now deployed as a production Docker application on Render.

The production setup uses:

| Component       | Value                   |
| --------------- | ----------------------- |
| Runtime         | Node.js + Express       |
| Container       | Production Docker image |
| Hosting         | Render                  |
| Database        | MongoDB Atlas           |
| File Storage    | Cloudinary              |
| Health Check    | `/health`               |
| Readiness Check | `/health/ready`         |
| Source Control  | GitHub                  |
| Environment     | production              |

The local Docker production environment remains useful for testing the production container architecture before deployment.

Render provides the hosted production environment, while MongoDB Atlas and Cloudinary provide persistent external services for the database and uploaded files.
