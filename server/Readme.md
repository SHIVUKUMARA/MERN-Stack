# MERN Backend — Production-Ready Reusable Server Template

A production-grade Node.js + Express + MongoDB backend built as a **reusable template** — authentication, generic query building (pagination/filter/search/sort/select/populate), multi-provider file uploads (Local, Cloudinary, AWS, Azure, GCS) with image/document/video processing, email delivery, audit logging, and rate limiting are all in place and designed to be dropped into any future project.

This README reflects the **actual current folder structure and features implemented so far**, based on the full project history. For deep-dives into individual modules, see [`docs/`](./docs).

---

## Table of Contents

- [Features Implemented](#features-implemented)
- [Tech Stack & Packages](#tech-stack--packages)
- [Project Structure](#project-structure)
- [Folder-by-Folder Purpose](#folder-by-folder-purpose)
- [Environment Variables](#environment-variables)
- [Installation & Setup](#installation--setup)
- [API Endpoints](#api-endpoints)
- [Documentation Index](#documentation-index)

---

## Features Implemented

### Core Infrastructure

- ✅ Express server setup (`server.js`, `config/app.js`)
- ✅ Centralized environment config (`config/env.js`)
- ✅ MongoDB connection (`database/mongodb.js`)
- ✅ Structured logging (`logger/`) — request logging + application logger
- ✅ Global error handling (`middleware/error.middleware.js`)
- ✅ 404 / Not Found handling (`middleware/notfound.middleware.js`)
- ✅ Standardized success responses (`ApiResponse`) and errors (`ApiError`)
- ✅ Async handler wrapper (no repetitive try/catch in controllers)
- ✅ API versioning (`routes/v1/`)
- ✅ Health check endpoint (`routes/health.routes.js`)

### Authentication & Authorization

- ✅ Register / Login
- ✅ Password hashing (bcrypt)
- ✅ JWT Access Tokens
- ✅ JWT Refresh Tokens + rotation
- ✅ HttpOnly cookie-based refresh token storage
- ✅ Logout
- ✅ Protected route middleware (`middleware/auth.middleware.js`)
- ✅ Current user endpoint
- ✅ Email verification
- ✅ Forgot password / reset password (email link based)
- ✅ Auth-specific rate limiting (`middleware/rateLimit/auth.rateLimit.js`)

### Validation

- ✅ Zod-based schema validation (`validators/`)
- ✅ Reusable `validate.middleware.js`

### Generic Query System (Core)

- ✅ Reusable `QueryBuilder` (`core/query/QueryBuilder.js`)
- ✅ Pagination
- ✅ Search
- ✅ Filtering
- ✅ Sorting
- ✅ Field selection
- ✅ Populate (relational data expansion)
- ✅ Pluggable executor pattern (`MongooseExecutor`) so the query layer isn't tightly bound to Mongoose

### File Upload System

- ✅ Multi-provider abstraction — one interface, swappable storage backend:
  - Local disk storage
  - Cloudinary
  - AWS S3
  - Azure Blob Storage
  - Google Cloud Storage
- ✅ Upload / Delete / Replace (single and batch: `uploadMany`, `deleteMany`, `replaceMany`)
- ✅ Media processing pipeline:
  - Image processing (resizing/optimization via `sharp`)
  - Document processing
  - Video processing (thumbnail extraction + metadata via `fluent-ffmpeg`)
- ✅ Multer-based upload middleware (`middleware/upload.middleware.js`, `config/multer.js`)
- ✅ Used for: user avatar, gallery images, documents, videos

### User Module

- ✅ Full User CRUD
- ✅ Profile update
- ✅ Change password
- ✅ Change role
- ✅ Soft-delete/list/search/filter via the generic query builder

### Platform / Production Concerns

- ✅ Email service — integrated with **Mailtrap**
- ✅ Audit logging (who did what, when, old/new values)
- ✅ API-wide rate limiting
- ✅ Auth-specific rate limiting

### Planned Next

- ⬜ Redis caching layer
- ⬜ Background jobs (BullMQ)
- ⬜ Cron scheduler (cleanup expired tokens/OTPs/temp uploads)
- ⬜ Notification module (email/SMS/push/in-app)
- ⬜ WebSocket (Socket.IO) for real-time features
- ⬜ Full RBAC / permission system
- ⬜ Swagger/OpenAPI documentation
- ⬜ Testing (Jest + Supertest)
- ⬜ Docker + CI/CD

---

## Tech Stack & Packages

| Category                   | Package                                                     | Purpose                                                              |
| -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Web framework              | `express`                                                   | Core HTTP server & middleware pipeline                               |
| Database                   | `mongodb`                                                   | Database engine                                                      |
| ODM                        | `mongoose`                                                  | Schema modeling, validation, hooks                                   |
| Auth                       | `jsonwebtoken`                                              | Signing/verifying access & refresh JWTs                              |
| Password hashing           | `bcrypt`                                                    | Hashing passwords before persistence                                 |
| Validation                 | `zod`                                                       | Schema-based request validation                                      |
| Config                     | `dotenv`                                                    | Loads `.env` into `process.env`                                      |
| Cookies                    | `cookie-parser`                                             | Reads httpOnly refresh-token cookie                                  |
| CORS                       | `cors`                                                      | Cross-origin access control for the frontend                         |
| File uploads (parsing)     | `multer`                                                    | Parses `multipart/form-data`, buffers files in memory for processing |
| Local storage              | Node `fs/promises`, `path`, `crypto`                        | Saves files to disk with unique filenames                            |
| Cloud storage — Cloudinary | `cloudinary`, `streamifier`                                 | Uploads buffered files to Cloudinary via stream                      |
| Cloud storage — AWS        | `@aws-sdk/client-s3` (or `aws-sdk`)                         | Uploads/deletes files in an S3 bucket                                |
| Cloud storage — Azure      | `@azure/storage-blob`                                       | Uploads/deletes files in Azure Blob Storage                          |
| Cloud storage — GCS        | `@google-cloud/storage`                                     | Uploads/deletes files in Google Cloud Storage                        |
| Image processing           | `sharp`                                                     | Resizing, format conversion (e.g. → `webp`), optimization            |
| Video processing           | `fluent-ffmpeg`, `ffmpeg-static`, `ffprobe-static`          | Metadata extraction, thumbnail generation from video                 |
| Email                      | Mailtrap (via `nodemailer` SMTP transport, or Mailtrap SDK) | Sends verification emails, password-reset links                      |
| Logging                    | Custom logger (`logger/`)                                   | Structured application + request logging                             |
| Rate limiting              | `express-rate-limit` (or equivalent)                        | Protects API and auth routes from abuse                              |

> Package list reflects what the implemented features require. Confirm exact package names/versions against your `package.json` — see [`docs/09-Packages-Used.md`](./docs/09-Packages-Used.md) for the per-package rationale.

---

## Project Structure

```
MERN/
├─ server/
│  ├─ config/
│  │  ├─ app.js
│  │  ├─ env.js
│  │  └─ multer.js
│  ├─ controllers/
│  │  ├─ auth.controller.js
│  │  └─ user.controller.js
│  ├─ core/
│  │  ├─ query/
│  │  │  ├─ executors/
│  │  │  │  ├─ index.js
│  │  │  │  └─ MongooseExecutor.js
│  │  │  ├─ parsers/
│  │  │  │  ├─ filter.js
│  │  │  │  ├─ index.js
│  │  │  │  ├─ paginate.js
│  │  │  │  ├─ populate.js
│  │  │  │  ├─ search.js
│  │  │  │  ├─ select.js
│  │  │  │  └─ sort.js
│  │  │  ├─ index.js
│  │  │  └─ QueryBuilder.js
│  │  ├─ response/
│  │  └─ validation/
│  ├─ database/
│  │  └─ mongodb.js
│  ├─ docs/
│  │  ├─ 01-Project-Overview.md
│  │  ├─ 02-Project-Setup.md
│  │  ├─ 03-Folder-Structure.md
│  │  ├─ 04-Authentication.md
│  │  ├─ 05-Validation.md
│  │  ├─ 06-Error-Handling.md
│  │  ├─ 07-Request-Life-Cycle.md
│  │  ├─ 08-Environment-Variables.md
│  │  ├─ 09-Packages-Used.md
│  │  ├─ 10-API-Reference.md
│  │  ├─ 11-API-Versioning.md
│  │  ├─ 12-Query-Builder.md
│  │  └─ 13-File-Upload-System.md
│  ├─ logger/
│  │  ├─ index.js
│  │  └─ request.logger.js
│  ├─ logs/
│  ├─ middleware/
│  │  ├─ rateLimit/
│  │  │  ├─ api.rateLimit.js
│  │  │  ├─ auth.rateLimit.js
│  │  │  ├─ createRateLimiter.js
│  │  │  └─ index.js
│  │  ├─ auth.middleware.js
│  │  ├─ error.middleware.js
│  │  ├─ notfound.middleware.js
│  │  └─ upload.middleware.js
│  ├─ models/
│  │  ├─ schemas/
│  │  │  └─ file.schema.js
│  │  └─ User.js
│  ├─ routes/
│  │  ├─ v1/
│  │  │  ├─ auth.routes.js
│  │  │  ├─ index.js
│  │  │  └─ user.routes.js
│  │  ├─ health.routes.js
│  │  └─ index.js
│  ├─ services/
│  │  ├─ upload/
│  │  │  ├─ processors/
│  │  │  │  ├─ document.processor.js
│  │  │  │  ├─ image.processor.js
│  │  │  │  ├─ index.js
│  │  │  │  ├─ presets.js
│  │  │  │  └─ video.processor.js
│  │  │  ├─ aws.service.js
│  │  │  ├─ azure.service.js
│  │  │  ├─ cloudinary.service.js
│  │  │  ├─ gcs.service.js
│  │  │  ├─ index.js
│  │  │  ├─ local.service.js
│  │  │  └─ upload.service.js
│  │  ├─ auth.service.js
│  │  └─ user.service.js
│  ├─ uploads/                     # local storage output (gitignored contents)
│  │  └─ users/
│  │     ├─ avatar/
│  │     ├─ documents/
│  │     ├─ gallery/
│  │     └─ videos/
│  ├─ utils/
│  │  ├─ ApiError.js
│  │  ├─ ApiResponse.js
│  │  ├─ asyncHandler.js
│  │  ├─ email.js
│  │  ├─ file.js
│  │  └─ validateObjectId.js
│  ├─ validators/
│  │  ├─ auth.validator.js
│  │  ├─ profile.validator.js
│  │  ├─ user.validator.js
│  │  └─ validate.middleware.js
│  ├─ .env
│  ├─ .gitignore
│  ├─ package.json
│  ├─ server.js
│  └─ test.js
└─ Readme.md
```

> `node_modules/` and other generated/dependency folders are intentionally excluded from this tree.

---

## Folder-by-Folder Purpose

| Folder                        | Purpose                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config/`                     | Centralized configuration: Express app setup (`app.js`), environment variable loading/validation (`env.js`), Multer configuration for handling `multipart/form-data` uploads (`multer.js`).                                                                                                                                                                                                      |
| `controllers/`                | Route handler logic — receives the request, delegates to the relevant service, and returns an `ApiResponse`. Kept thin; business logic lives in `services/`.                                                                                                                                                                                                                                     |
| `core/`                       | Framework-agnostic, highly reusable building blocks not tied to one specific feature. Currently houses the generic **Query Builder** system (`core/query/`) used by every list/search endpoint, plus placeholders for shared `response/` and `validation/` core logic.                                                                                                                           |
| `core/query/parsers/`         | Each file parses one query concern from the request's query string — `paginate.js` (page/limit), `filter.js` (field filters), `search.js` (text search), `sort.js` (sort order), `select.js` (field projection), `populate.js` (relational expansion).                                                                                                                                           |
| `core/query/executors/`       | Executes the built query against a data layer. `MongooseExecutor.js` is the Mongoose-specific implementation, kept behind an interface (`index.js`) so a different ORM/driver could be swapped in later.                                                                                                                                                                                         |
| `database/`                   | Database connection logic — `mongodb.js` establishes and manages the Mongoose/MongoDB connection at startup.                                                                                                                                                                                                                                                                                     |
| `docs/`                       | This documentation folder — one file per module/topic.                                                                                                                                                                                                                                                                                                                                           |
| `logger/`                     | Application-wide structured logging. `index.js` is the core logger instance/config; `request.logger.js` is Express middleware that logs each incoming request.                                                                                                                                                                                                                                   |
| `logs/`                       | Output directory where log files are written (gitignored).                                                                                                                                                                                                                                                                                                                                       |
| `middleware/`                 | Express middleware used across routes: `auth.middleware.js` (JWT verification / `protect`), `error.middleware.js` (global error handler), `notfound.middleware.js` (404 handler), `upload.middleware.js` (wraps Multer for file-upload routes), and `rateLimit/` (see below).                                                                                                                    |
| `middleware/rateLimit/`       | Rate limiting configuration. `createRateLimiter.js` is a factory for building a limiter with given options; `api.rateLimit.js` applies a general limit across the API; `auth.rateLimit.js` applies a stricter limit to sensitive auth routes (login, register, password reset) to slow down brute-force/credential-stuffing attempts.                                                            |
| `models/`                     | Mongoose schemas/models. `User.js` is the core user schema (credentials, roles, refresh token reference, etc.); `models/schemas/file.schema.js` is a reusable sub-schema describing an uploaded file's metadata (storage provider, URL, size, mimetype, etc.), embedded wherever a document needs to reference uploaded files (avatar, gallery, documents, videos).                              |
| `routes/`                     | Express routers. `routes/v1/` holds the versioned API contract (auth, user); `routes/health.routes.js` exposes a health-check endpoint; `routes/index.js` mounts everything into the app. See [`11-API-Versioning.md`](./docs/11-API-Versioning.md).                                                                                                                                             |
| `services/`                   | Business logic layer. `auth.service.js` and `user.service.js` hold the core logic for their respective domains; `services/upload/` is the multi-provider file upload subsystem (see below).                                                                                                                                                                                                      |
| `services/upload/`            | Provider-agnostic upload abstraction. `upload.service.js` is the single entry point controllers call; it delegates to whichever provider service (`local.service.js`, `cloudinary.service.js`, `aws.service.js`, `azure.service.js`, `gcs.service.js`) is configured, so switching storage backends doesn't require touching controller code. `index.js` wires up the active provider.           |
| `services/upload/processors/` | Media processing pipeline run **before** a file is handed to a storage provider. `image.processor.js` (via `sharp`) resizes/optimizes images; `video.processor.js` (via `fluent-ffmpeg`) extracts metadata and generates a thumbnail; `document.processor.js` handles document-specific processing; `presets.js` defines reusable size/quality presets (e.g. avatar dimensions, thumbnail size). |
| `uploads/`                    | Default output directory for the **local storage provider** — organized by entity/type (`users/avatar`, `users/gallery`, `users/documents`, `users/videos`), including generated thumbnail subfolders.                                                                                                                                                                                           |
| `utils/`                      | Small reusable helpers: `ApiError.js` (custom error class), `ApiResponse.js` (standard success response shape), `asyncHandler.js` (removes repetitive try/catch), `email.js` (email-sending helper wired to Mailtrap), `file.js` (shared file utilities — extension extraction, storage provider constants), `validateObjectId.js` (validates MongoDB ObjectId route params).                    |
| `validators/`                 | Zod schemas per domain (`auth.validator.js`, `user.validator.js`, `profile.validator.js`) plus the shared `validate.middleware.js` that runs any given schema against the incoming request.                                                                                                                                                                                                      |
| `server.js`                   | Application entry point — connects to MongoDB, then starts the HTTP server.                                                                                                                                                                                                                                                                                                                      |
| `test.js`                     | Ad-hoc script for manual testing/experimentation during development.                                                                                                                                                                                                                                                                                                                             |

---

## Environment Variables

Based on the features implemented, the `.env` file includes (at minimum) the following groups. See [`docs/08-Environment-Variables.md`](./docs/08-Environment-Variables.md) for full details.

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=

# JWT
ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=7d

# Cookies / CORS
COOKIE_SECURE=false
CLIENT_URL=

# Upload — active storage provider
STORAGE_PROVIDER=local        # local | cloudinary | aws | azure | gcs
UPLOAD_DESTINATION=uploads
UPLOAD_BASE_URL=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=

# Google Cloud Storage
GCS_PROJECT_ID=
GCS_BUCKET=
GCS_KEYFILE_PATH=

# Mailtrap / Email
MAILTRAP_HOST=
MAILTRAP_PORT=
MAILTRAP_USER=
MAILTRAP_PASS=
EMAIL_FROM=

# Rate Limiting
API_RATE_LIMIT_WINDOW_MS=
API_RATE_LIMIT_MAX=
AUTH_RATE_LIMIT_WINDOW_MS=
AUTH_RATE_LIMIT_MAX=
```

---

## Installation & Setup

```bash
git clone <your-repo-url>
cd server
npm install
cp .env.example .env   # fill in real values
npm run dev             # development (nodemon)
npm start                # production
```

Full walkthrough: [`docs/02-Project-Setup.md`](./docs/02-Project-Setup.md)

---

## API Endpoints

All routes are prefixed with `/api/v1` (see [`docs/11-API-Versioning.md`](./docs/11-API-Versioning.md)). This list reflects the features implemented in this project so far, grouped by module.

### Auth (`/api/v1/auth`)

| Method | Endpoint               | Auth Required | Description                                              |
| ------ | ---------------------- | :-----------: | -------------------------------------------------------- |
| POST   | `/register`            |      ❌       | Register a new user                                      |
| POST   | `/login`               |      ❌       | Log in — returns access token, sets refresh token cookie |
| POST   | `/refresh-token`       |  ❌ (cookie)  | Rotate refresh token, issue new access token             |
| POST   | `/logout`              |      ✅       | Invalidate refresh token, clear cookie                   |
| GET    | `/me`                  |      ✅       | Get current authenticated user                           |
| POST   | `/verify-email`        |      ❌       | Verify a user's email via emailed token                  |
| POST   | `/resend-verification` |    ✅ / ❌    | Resend the email verification link                       |
| POST   | `/forgot-password`     |      ❌       | Request a password-reset link via email                  |
| POST   | `/reset-password`      |      ❌       | Reset password using the emailed token                   |

### User (`/api/v1/users`)

| Method | Endpoint             | Auth Required | Description                                                                                            |
| ------ | -------------------- | :-----------: | ------------------------------------------------------------------------------------------------------ |
| GET    | `/`                  |      ✅       | List users — supports pagination, search, filter, sort, select, populate via the generic Query Builder |
| GET    | `/:id`               |      ✅       | Get a single user by ID                                                                                |
| PATCH  | `/profile`           |      ✅       | Update the current user's profile                                                                      |
| PATCH  | `/change-password`   |      ✅       | Change the current user's password                                                                     |
| PATCH  | `/change-role`       |      ✅       | Change a user's role (admin action)                                                                    |
| DELETE | `/:id`               |      ✅       | Delete a user                                                                                          |
| POST   | `/avatar`            |      ✅       | Upload/replace the current user's avatar                                                               |
| POST   | `/gallery`           |      ✅       | Upload gallery image(s)                                                                                |
| DELETE | `/gallery/:fileId`   |      ✅       | Delete a gallery image                                                                                 |
| POST   | `/documents`         |      ✅       | Upload document(s)                                                                                     |
| DELETE | `/documents/:fileId` |      ✅       | Delete a document                                                                                      |
| POST   | `/videos`            |      ✅       | Upload a video (processed for thumbnail + metadata)                                                    |
| DELETE | `/videos/:fileId`    |      ✅       | Delete a video                                                                                         |

### Health (`/api/health` or `/health`)

| Method | Endpoint | Auth Required | Description            |
| ------ | -------- | :-----------: | ---------------------- |
| GET    | `/`      |      ❌       | Server/DB health check |

> ⚠️ Exact upload sub-routes (avatar/gallery/documents/videos) and their precise paths depend on how `user.routes.js` wires up `upload.middleware.js` — confirm against your actual route file and adjust this table if paths differ. Full request/response shapes: [`docs/10-API-Reference.md`](./docs/10-API-Reference.md).

---

## Documentation Index

| File                                                                     | Covers                                                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`docs/01-Project-Overview.md`](./docs/01-Project-Overview.md)           | High-level goals and architecture philosophy                               |
| [`docs/02-Project-Setup.md`](./docs/02-Project-Setup.md)                 | Step-by-step local setup                                                   |
| [`docs/03-Folder-Structure.md`](./docs/03-Folder-Structure.md)           | Purpose of every folder/file (expanded)                                    |
| [`docs/04-Authentication.md`](./docs/04-Authentication.md)               | Full auth flow: JWT, refresh rotation, email verification, password reset  |
| [`docs/05-Validation.md`](./docs/05-Validation.md)                       | Zod validation approach                                                    |
| [`docs/06-Error-Handling.md`](./docs/06-Error-Handling.md)               | ApiError, ApiResponse, asyncHandler, global middleware                     |
| [`docs/07-Request-Life-Cycle.md`](./docs/07-Request-Life-Cycle.md)       | How a request travels through the app                                      |
| [`docs/08-Environment-Variables.md`](./docs/08-Environment-Variables.md) | Every `.env` key explained                                                 |
| [`docs/09-Packages-Used.md`](./docs/09-Packages-Used.md)                 | Why each dependency was chosen                                             |
| [`docs/10-API-Reference.md`](./docs/10-API-Reference.md)                 | Full endpoint reference with sample requests/responses                     |
| [`docs/11-API-Versioning.md`](./docs/11-API-Versioning.md)               | API versioning strategy                                                    |
| [`docs/12-Query-Builder.md`](./docs/12-Query-Builder.md)                 | How the generic pagination/filter/search/sort/select/populate system works |
| [`docs/13-File-Upload-System.md`](./docs/13-File-Upload-System.md)       | Multi-provider upload architecture, image/document/video processing        |
| [`docs/14-CICD-Githubactions.md`](./docs/14-CICD-githubactions.md)           | High-level goals and architecture philosophy    

---

## License

Private / unlicensed for now.
