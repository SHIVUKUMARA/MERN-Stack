# 09 — Packages Used

Every dependency the implemented features rely on, and why.

## Core

| Package         | Purpose                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------- |
| `express`       | Core web framework — routing, middleware pipeline                                         |
| `mongoose`      | ODM for MongoDB — schemas, validation, hooks (used for `User.js` and the file sub-schema) |
| `dotenv`        | Loads `.env` into `process.env`, centralized via `config/env.js`                          |
| `cors`          | Restricts cross-origin requests to `CLIENT_URL`                                           |
| `cookie-parser` | Parses cookies (needed to read the httpOnly refresh-token cookie)                         |

## Auth & Security

| Package                              | Purpose                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `jsonwebtoken`                       | Signs/verifies access and refresh JWTs                                          |
| `bcrypt`                             | Hashes and verifies passwords                                                   |
| `express-rate-limit` (or equivalent) | Powers `middleware/rateLimit/` — general API and auth-specific request limiting |

## Validation

| Package | Purpose                                                                     |
| ------- | --------------------------------------------------------------------------- |
| `zod`   | Declarative schema validation for every request body, used in `validators/` |

## File Uploads & Processing

| Package                  | Purpose                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `multer`                 | Parses `multipart/form-data`, buffers uploaded files in memory for `config/multer.js` / `middleware/upload.middleware.js`                    |
| `cloudinary`             | Uploads/deletes files against the Cloudinary API — used by `services/upload/cloudinary.service.js`                                           |
| `streamifier`            | Converts an in-memory buffer into a readable stream so it can be piped into Cloudinary's `upload_stream`                                     |
| AWS SDK (S3 client)      | Uploads/deletes objects in S3 — used by `services/upload/aws.service.js`                                                                     |
| Azure Storage Blob SDK   | Uploads/deletes blobs — used by `services/upload/azure.service.js`                                                                           |
| Google Cloud Storage SDK | Uploads/deletes objects — used by `services/upload/gcs.service.js`                                                                           |
| `sharp`                  | Image resizing/format conversion/optimization — used in `services/upload/processors/image.processor.js` and for video-thumbnail optimization |
| `fluent-ffmpeg`          | Node wrapper around ffmpeg — extracts video metadata and generates thumbnails in `video.processor.js`                                        |
| `ffmpeg-static`          | Provides a prebuilt `ffmpeg` binary so the system doesn't need ffmpeg installed separately                                                   |
| `ffprobe-static`         | Provides a prebuilt `ffprobe` binary, used for reading video metadata (duration, codec, resolution, fps)                                     |

## Email

| Package                                                 | Purpose                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Nodemailer (SMTP transport to Mailtrap) or Mailtrap SDK | Sends verification and password-reset emails through Mailtrap in `utils/email.js` |

## Logging

| Package                           | Purpose                                            |
| --------------------------------- | -------------------------------------------------- |
| Custom logger (`logger/index.js`) | Structured application logging, writing to `logs/` |

## Development

| Package   | Purpose                                                     |
| --------- | ----------------------------------------------------------- |
| `nodemon` | Auto-restarts the server on file changes during development |

## Considered but Not Used

### `express-validator`

Evaluated early on as a request-validation option (a draft implementation was written), but **Zod was adopted instead before `express-validator` was ever installed as a real dependency**. Documented here only because understanding what was considered explains the validation architecture — see [`05-Validation.md`](./05-Validation.md).

> Confirm exact package names/versions (e.g. `@aws-sdk/client-s3` vs `aws-sdk`, `nodemailer` vs a Mailtrap SDK) against your `package.json`, since this document is based on the features implemented rather than a direct read of the lockfile.
