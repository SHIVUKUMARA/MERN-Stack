# 07 — Request Life Cycle

Example walkthrough: `GET /api/v1/users?page=2&limit=10&search=rakesh&sort=-createdAt`

1. **Request hits `config/app.js`** — global middleware runs: `logger/request.logger.js` logs the incoming request, `cors()` checks origin, `cookie-parser` parses cookies, `express.json()` parses the body (empty for a GET).
2. **Rate limiter** (`middleware/rateLimit/api.rateLimit.js`) checks the request against the general API limit.
3. **Route matching** — `routes/index.js` → `routes/v1/index.js` → `routes/v1/user.routes.js` matches `GET /`.
4. **`protect` middleware** (`middleware/auth.middleware.js`) verifies the access token and attaches `req.user`.
5. **Controller** (`controllers/user.controller.js`) runs, wrapped in `asyncHandler`:
   - Passes `req.query` into `core/query/QueryBuilder.js`.
   - The builder runs each parser (`paginate.js`, `search.js`, `sort.js`, etc.) to build a query spec.
   - `core/query/executors/MongooseExecutor.js` runs the spec against the `User` model.
   - Results + pagination metadata are wrapped in an `ApiResponse` and returned.
6. **If anything throws** at any step (invalid token, DB error, bad query param) — execution jumps straight to `middleware/error.middleware.js`, skipping remaining steps.

## Visual

```
Request
   │
   ▼
request.logger.js ─▶ cors() ─▶ cookie-parser ─▶ express.json()
   │
   ▼
api.rateLimit.js ──▶ [limit exceeded] ──▶ error.middleware.js
   │
   ▼
Router match (routes/v1/user.routes.js)
   │
   ▼
protect middleware ──▶ [invalid/missing token] ──▶ error.middleware.js
   │
   ▼
Controller (asyncHandler-wrapped)
   │
   ▼
QueryBuilder → parsers → MongooseExecutor ──▶ [DB error] ──▶ error.middleware.js
   │
   ▼
ApiResponse sent to client
```

## Example: File Upload Request

`POST /api/v1/users/avatar` (multipart/form-data):

```
Request
   │
   ▼
Global middleware (as above)
   │
   ▼
protect middleware
   │
   ▼
upload.middleware.js (Multer, via config/multer.js) → parses file into req.file
   │
   ▼
Controller → services/upload/upload.service.js
   │
   ▼
services/upload/processors/image.processor.js (resize/optimize via sharp)
   │
   ▼
services/upload/<provider>.service.js (local / cloudinary / aws / azure / gcs)
   │
   ▼
File metadata saved on the User document (models/schemas/file.schema.js)
   │
   ▼
ApiResponse sent to client
```

## Key takeaway

Every layer either calls `next()`/returns a result, or throws — and every error, regardless of which layer it came from, funnels into the same `error.middleware.js`, keeping every response (success or failure) in a predictable shape.
