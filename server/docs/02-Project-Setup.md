# 02 — Project Setup

## Prerequisites

- **Node.js** v18+
- **MongoDB** — local instance or MongoDB Atlas
- **npm**
- A REST client (Postman, Insomnia, Thunder Client) for testing endpoints
- (Optional, depending on which upload provider you use) accounts/credentials for **Cloudinary**, **AWS S3**, **Azure Blob Storage**, or **Google Cloud Storage**
- A **Mailtrap** account (or another SMTP provider) for email delivery in development

## 1. Clone the repository

```bash
git clone <your-repo-url>
cd server
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Copy `.env.example` (or create `.env` from scratch) and fill in every key described in [`08-Environment-Variables.md`](./08-Environment-Variables.md) — at minimum: server config, MongoDB URI, JWT secrets, the active `STORAGE_PROVIDER` and its matching credentials, and Mailtrap SMTP credentials.

## 4. Start MongoDB

Either run `mongod` locally, or point `MONGODB_URI` at an Atlas cluster.

## 5. Choose and configure your upload provider

Set `STORAGE_PROVIDER` in `.env` to one of: `local`, `cloudinary`, `aws`, `azure`, `gcs`, and fill in the corresponding credential block. Only the active provider's credentials are required — see [`13-File-Upload-System.md`](./13-File-Upload-System.md).

If using `local`, the `uploads/` directory is used automatically and is git-ignored.

## 6. Run the server

```bash
npm run dev     # development, auto-restart via nodemon
npm start        # production
```

## 7. Verify

```bash
curl http://localhost:5000/health
```

Then try registering a user via `POST /api/v1/auth/register`.

## Common Setup Issues

| Problem                               | Likely Cause                                                         | Fix                                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `MongooseServerSelectionError`        | MongoDB not reachable                                                | Check `mongod` is running / Atlas URI + IP allow-list                                                                   |
| Uploads failing silently              | `STORAGE_PROVIDER` set but matching credentials missing              | Double-check the `.env` block for the selected provider                                                                 |
| Emails not arriving                   | Wrong Mailtrap credentials or inbox not checked                      | Verify `MAILTRAP_*` values; Mailtrap catches emails in a sandbox inbox, not the real recipient                          |
| `429 Too Many Requests` while testing | Rate limiter triggered                                               | Expected behavior — wait out the window or temporarily raise the limit in `.env` for local testing                      |
| Video upload processing errors        | `ffmpeg-static` / `ffprobe-static` binaries not resolving on your OS | Reinstall: `npm rebuild ffmpeg-static ffprobe-static`, or verify with `node -e "console.log(require('ffmpeg-static'))"` |
