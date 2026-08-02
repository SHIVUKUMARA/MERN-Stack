# 01 — Project Overview

## What is this project?

A **reusable production-grade backend template** built with Node.js, Express, and MongoDB. The goal isn't a single-purpose app — it's a foundation (auth, generic querying, multi-provider file uploads, email, audit logs, rate limiting) that can be dropped into any future project and extended with domain-specific modules.

## Design Philosophy

- **Layered architecture** — routes → validators → middleware → controllers → services → models, each with one responsibility.
- **Provider abstraction over lock-in** — the upload system supports Local, Cloudinary, AWS, Azure, and GCS behind one interface (`services/upload/upload.service.js`), so switching storage backends is a config change, not a rewrite.
- **Reusable `core/` layer** — the Query Builder (pagination, filter, search, sort, select, populate) is written once in `core/query/` and reused by every list endpoint, instead of being reimplemented per module.
- **Consistent response/error shape** — every endpoint, success or failure, returns the same JSON envelope via `ApiResponse`/`ApiError`, handled centrally by the global error middleware.
- **Incremental complexity** — features like versioning, RBAC, and caching are added when there's a real need, not preemptively (see [`11-API-Versioning.md`](./11-API-Versioning.md) for the reasoning behind this principle).

## Architecture at a Glance

```
Client
  │
  ▼
Express App (server.js → config/app.js)
  │
  ├── cors / cookie-parser / json body parsing / request logger
  │
  ├── routes/v1/*  ──▶ validators/*.validator.js (Zod)
  │                          │
  │                          ▼
  │                   middleware/auth.middleware.js (protected routes)
  │                          │
  │                          ▼
  │                   controllers/*.controller.js
  │                          │
  │                          ▼
  │                   services/*.service.js  ──▶ models/*.js ──▶ MongoDB
  │                          │
  │                          └──▶ services/upload/*  (file uploads)
  │                          └──▶ utils/email.js  (Mailtrap)
  │
  ├── middleware/notfound.middleware.js  (unmatched routes)
  └── middleware/error.middleware.js     (formats every thrown error)
```

## What's Been Built So Far

See the [main README's Features Implemented section](../README.md#features-implemented) for the full checklist — in short: complete authentication (with email verification and password reset), a generic query system, a five-provider file upload system with image/document/video processing, audit logging, and API/auth rate limiting.

## What's Next

Redis caching, background jobs (BullMQ), a cron scheduler, notifications, WebSocket support, a full RBAC/permission system, Swagger docs, testing, Docker, and CI/CD — see the Roadmap in the main README.
