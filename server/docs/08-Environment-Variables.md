# 08 — Environment Variables

All configuration lives in `.env`, loaded via `dotenv` and centralized in `config/env.js` so the rest of the app never touches `process.env` directly.

## Server

| Key        | Description                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `PORT`     | Port the Express server listens on                                                                    |
| `NODE_ENV` | `development` / `production` — controls stack-trace exposure, cookie security defaults, log verbosity |

## Database

| Key           | Description                                     |
| ------------- | ----------------------------------------------- |
| `MONGODB_URI` | Full MongoDB connection string (local or Atlas) |

## JWT

| Key                    | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `ACCESS_TOKEN_SECRET`  | Signs/verifies short-lived access tokens                                      |
| `ACCESS_TOKEN_EXPIRY`  | Access token lifetime (e.g. `15m`)                                            |
| `REFRESH_TOKEN_SECRET` | Signs/verifies long-lived refresh tokens — must differ from the access secret |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime (e.g. `7d`)                                            |

## Cookies / CORS

| Key             | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `COOKIE_SECURE` | `true` in production (HTTPS-only cookies), `false` locally |
| `CLIENT_URL`    | Frontend origin allowed by CORS                            |

## File Uploads

| Key                  | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `STORAGE_PROVIDER`   | Active upload provider: `local`, `cloudinary`, `aws`, `azure`, or `gcs` |
| `UPLOAD_DESTINATION` | Base folder for local storage (e.g. `uploads`)                          |
| `UPLOAD_BASE_URL`    | Base URL prefix used to build a public URL for locally stored files     |

### Cloudinary

| Key                     | Description                   |
| ----------------------- | ----------------------------- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY`    | Cloudinary API key            |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret         |

### AWS S3

| Key                     | Description                        |
| ----------------------- | ---------------------------------- |
| `AWS_ACCESS_KEY_ID`     | IAM access key with S3 permissions |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key                     |
| `AWS_REGION`            | Bucket region (e.g. `ap-south-1`)  |
| `AWS_S3_BUCKET`         | Target bucket name                 |

### Azure Blob Storage

| Key                               | Description                                    |
| --------------------------------- | ---------------------------------------------- |
| `AZURE_STORAGE_CONNECTION_STRING` | Full connection string for the storage account |
| `AZURE_STORAGE_CONTAINER`         | Target container name                          |

### Google Cloud Storage

| Key                | Description                              |
| ------------------ | ---------------------------------------- |
| `GCS_PROJECT_ID`   | GCP project ID                           |
| `GCS_BUCKET`       | Target bucket name                       |
| `GCS_KEYFILE_PATH` | Path to the service account JSON keyfile |

## Email (Mailtrap)

| Key             | Description                                    |
| --------------- | ---------------------------------------------- |
| `MAILTRAP_HOST` | SMTP host                                      |
| `MAILTRAP_PORT` | SMTP port                                      |
| `MAILTRAP_USER` | SMTP username                                  |
| `MAILTRAP_PASS` | SMTP password                                  |
| `EMAIL_FROM`    | Default "from" address used on outgoing emails |

## Rate Limiting

| Key                         | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `API_RATE_LIMIT_WINDOW_MS`  | Time window (ms) for the general API limiter                             |
| `API_RATE_LIMIT_MAX`        | Max requests per window for general API routes                           |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Time window (ms) for the stricter auth limiter                           |
| `AUTH_RATE_LIMIT_MAX`       | Max requests per window for auth routes (login/register/forgot-password) |

## Best Practices

- `.env` is git-ignored; only `.env.example` (placeholder values) is committed.
- `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` must be different, high-entropy values:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- Only the credentials for the **active** `STORAGE_PROVIDER` are strictly required — the others can be left blank until that provider is used.
- In production, `COOKIE_SECURE` must be `true`.
