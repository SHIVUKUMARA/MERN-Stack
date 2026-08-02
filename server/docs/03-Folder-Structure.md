# 03 — Folder Structure (Detailed)

Full breakdown of every folder and file currently in the project (`node_modules/` excluded). For the visual tree, see the [main README](../README.md#project-structure).

## `config/`

| File        | Purpose                                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.js`    | Assembles the Express app: mounts global middleware (CORS, cookie-parser, JSON body parsing, request logger), mounts routers, and mounts the `notfound`/`error` middleware last. |
| `env.js`    | Loads and centralizes all environment variables from `.env` (via `dotenv`) into a single exported config object, so the rest of the app never calls `process.env` directly.      |
| `multer.js` | Configures Multer (memory storage, file size limits, allowed mimetypes) used by `middleware/upload.middleware.js` to parse incoming `multipart/form-data`.                       |

## `controllers/`

| File                 | Purpose                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.controller.js` | Handles register, login, logout, refresh-token, current-user, email verification, and forgot/reset password requests. Delegates all business logic to `auth.service.js` and returns `ApiResponse`. |
| `user.controller.js` | Handles user CRUD, profile updates, password/role changes, and file-upload endpoints (avatar/gallery/documents/videos) for the user domain. Delegates to `user.service.js`.                        |

## `core/`

Framework-agnostic reusable logic not tied to a single feature/domain.

### `core/query/`

| File              | Purpose                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QueryBuilder.js` | The main class/entry point. Takes the incoming `req.query`, runs it through each parser, and produces a query specification that an executor can run. |
| `index.js`        | Exports the query system's public interface.                                                                                                          |

### `core/query/parsers/`

Each parser is responsible for interpreting **one** query-string concern:
| File | Purpose |
|---|---|
| `paginate.js` | Reads `page`/`limit` and computes `skip`/`limit` values. |
| `filter.js` | Reads field-based filter params (e.g. `?role=admin`) and builds a Mongo-compatible filter object. |
| `search.js` | Reads a `search`/`q` param and builds a text-search condition across configured fields. |
| `sort.js` | Reads a `sort` param (e.g. `-createdAt`) and builds a sort spec. |
| `select.js` | Reads a `fields` param and builds a projection (which fields to return). |
| `populate.js` | Reads a `populate` param and builds relational population instructions (which referenced documents to expand). |
| `index.js` | Exports all parsers together. |

### `core/query/executors/`

| File                  | Purpose                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MongooseExecutor.js` | Takes the built query spec and actually runs it against a Mongoose model (find, count, paginate, populate, etc.), returning results + pagination metadata. |
| `index.js`            | Exports the executor(s); kept separate from parsers so the query-building logic stays independent of the underlying database driver.                       |

### `core/response/` and `core/validation/`

Reserved for shared response-shaping and validation logic that may be promoted here as it's generalized further (currently thin/placeholder relative to `utils/ApiResponse.js` and `validators/`).

## `database/`

| File         | Purpose                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| `mongodb.js` | Connects to MongoDB via Mongoose using `MONGODB_URI`, and handles connection event logging/errors at startup. |

## `docs/`

This documentation folder.

## `logger/`

| File                | Purpose                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `index.js`          | The core logger instance/configuration (log levels, output format, file destinations under `logs/`).  |
| `request.logger.js` | Express middleware that logs method, path, status code, and response time for every incoming request. |

## `logs/`

Directory where log files are written at runtime (git-ignored).

## `middleware/`

| File                     | Purpose                                                                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.middleware.js`     | The `protect` middleware — verifies the JWT access token from the `Authorization` header and attaches `req.user`; used on every protected route.                                          |
| `error.middleware.js`    | Global error handler — the last middleware in the chain; formats every thrown `ApiError`/`Error` into a consistent JSON error response.                                                   |
| `notfound.middleware.js` | Catches requests to routes that don't exist and forwards a 404 `ApiError` to the global error handler.                                                                                    |
| `upload.middleware.js`   | Wraps Multer (configured in `config/multer.js`) to parse file uploads on routes that accept files (avatar, gallery, documents, videos), attaching parsed files to `req.file`/`req.files`. |

### `middleware/rateLimit/`

| File                   | Purpose                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createRateLimiter.js` | A factory function that builds a rate limiter given options (window, max requests, message) — avoids duplicating limiter config.                               |
| `api.rateLimit.js`     | A general-purpose limiter applied broadly across the API to prevent abuse.                                                                                     |
| `auth.rateLimit.js`    | A stricter limiter applied specifically to sensitive auth routes (login, register, forgot-password) to slow down brute-force and credential-stuffing attempts. |
| `index.js`             | Exports all configured limiters for use in routes.                                                                                                             |

## `models/`

| File                     | Purpose                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User.js`                | The core Mongoose User schema — credentials, role, refresh-token reference, email-verification/reset-token fields, timestamps, and instance methods (e.g. password comparison, token generation).                                                                                                                              |
| `schemas/file.schema.js` | A reusable **sub-schema** describing an uploaded file's metadata (storage provider, URL/path, public ID, filename, mimetype, size, uploaded date). Embedded into any parent document that references uploaded files (e.g. a user's avatar, gallery, documents, videos), so upload metadata is consistent everywhere it's used. |

## `routes/`

| File               | Purpose                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `index.js`         | The root router — mounts `routes/v1` (and `health.routes.js`) into the Express app.                         |
| `health.routes.js` | Exposes a health-check endpoint (server/DB status) — useful for uptime monitoring and load balancer checks. |

### `routes/v1/`

| File             | Purpose                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `index.js`       | Mounts all `v1` domain routers (`auth.routes.js`, `user.routes.js`) under the `/api/v1` prefix.                            |
| `auth.routes.js` | Defines all authentication endpoints and wires up the appropriate validator + rate-limiter + controller for each.          |
| `user.routes.js` | Defines all user CRUD and file-upload endpoints, wiring up validation, `protect`, and `upload.middleware.js` where needed. |

See [`11-API-Versioning.md`](./11-API-Versioning.md) for why routes are versioned while controllers/services are not (yet).

## `services/`

| File              | Purpose                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.service.js` | Business logic for registration, login, token generation/rotation, logout, email verification, and password reset.                        |
| `user.service.js` | Business logic for user CRUD, profile/password/role updates, and orchestrating file uploads for a user (calling into `services/upload/`). |

### `services/upload/`

| File                    | Purpose                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `upload.service.js`     | The single entry point the rest of the app calls for any upload/delete/replace operation. Reads the configured `STORAGE_PROVIDER` and delegates to the matching provider service. |
| `local.service.js`      | Saves files to disk under `uploads/`, generating a unique filename and returning a relative path + URL.                                                                           |
| `cloudinary.service.js` | Uploads files to Cloudinary via a stream (`streamifier`), returning the secure URL and `publicId`.                                                                                |
| `aws.service.js`        | Uploads/deletes files in an AWS S3 bucket.                                                                                                                                        |
| `azure.service.js`      | Uploads/deletes files in Azure Blob Storage.                                                                                                                                      |
| `gcs.service.js`        | Uploads/deletes files in Google Cloud Storage.                                                                                                                                    |
| `index.js`              | Wires up and exports the active provider based on config.                                                                                                                         |

Every provider service implements the same interface (`upload`, `delete`, `replace`, `uploadMany`, `deleteMany`, `replaceMany`), so `upload.service.js` and everything above it never needs to know which provider is active.

### `services/upload/processors/`

| File                    | Purpose                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `image.processor.js`    | Uses `sharp` to resize/convert/optimize images (e.g. to `webp`) before they're handed to a storage provider.                                                                                            |
| `video.processor.js`    | Uses `fluent-ffmpeg` (with `ffmpeg-static`/`ffprobe-static` binaries) to extract video metadata (duration, resolution, codec, fps) and generate a thumbnail image, which is then optimized via `sharp`. |
| `document.processor.js` | Handles document-specific pre-processing before storage.                                                                                                                                                |
| `presets.js`            | Defines reusable processing presets (e.g. avatar dimensions, thumbnail size/quality) so processors don't hardcode magic numbers.                                                                        |
| `index.js`              | Exports all processors together.                                                                                                                                                                        |

## `uploads/`

The default output directory used by the **local** storage provider, organized by entity and file type (`users/avatar`, `users/gallery`, `users/documents`, `users/videos`), including generated thumbnail subfolders for avatars and videos. Contents are git-ignored; only the folder structure (`.gitkeep`) is tracked.

## `utils/`

| File                  | Purpose                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiError.js`         | Custom `Error` subclass carrying `statusCode`, `message`, and an optional `errors` array — thrown anywhere in the app for predictable error handling. |
| `ApiResponse.js`      | Standard shape for successful responses (`statusCode`, `data`, `message`, `success`).                                                                 |
| `asyncHandler.js`     | Wraps async controllers/middleware so thrown errors are automatically forwarded to `next()`, removing repetitive `try/catch`.                         |
| `email.js`            | Email-sending helper — builds and sends messages (verification, password reset) through the configured Mailtrap SMTP transport.                       |
| `file.js`             | Shared file utilities — e.g. `getExtension()`, `STORAGE_PROVIDERS` constants used across upload services.                                             |
| `validateObjectId.js` | Validates that a route param is a well-formed MongoDB `ObjectId` before it's used in a query.                                                         |

## `validators/`

| File                     | Purpose                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `auth.validator.js`      | Zod schemas for register/login/forgot-password/reset-password/etc.                                                                   |
| `user.validator.js`      | Zod schemas for user CRUD operations.                                                                                                |
| `profile.validator.js`   | Zod schemas for profile updates (name, email, password change).                                                                      |
| `validate.middleware.js` | Generic middleware that runs any given Zod schema against `req.body` (or query/params) and throws a formatted `ApiError` on failure. |

## Root files

| File                                 | Purpose                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `server.js`                          | Application entry point — connects to MongoDB (`database/mongodb.js`), then starts the HTTP server via the app assembled in `config/app.js`. |
| `test.js`                            | Scratch file for manual, ad-hoc testing during development (not part of the production app).                                                 |
| `.env`                               | Environment variables (git-ignored).                                                                                                         |
| `.gitignore`                         | Excludes `node_modules/`, `.env`, `logs/`, `uploads/*` contents, etc. from version control.                                                  |
| `package.json` / `package-lock.json` | Dependency manifest and lockfile.                                                                                                            |
