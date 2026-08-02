# 10 — API Reference

Base URL: `http://localhost:5000/api/v1`

This reference lists every endpoint implemented so far, grouped by module. Exact sub-paths for upload routes should be confirmed against `routes/v1/user.routes.js` — they're listed here based on the features described throughout the project (avatar/gallery/documents/videos upload).

---

## Auth (`/auth`)

| Method | Endpoint               |    Auth     | Description                                                        |
| ------ | ---------------------- | :---------: | ------------------------------------------------------------------ |
| POST   | `/register`            |     ❌      | Register a new user; sends an email-verification link              |
| POST   | `/login`               |     ❌      | Log in — returns access token, sets refresh-token httpOnly cookie  |
| POST   | `/refresh-token`       | ❌ (cookie) | Rotates the refresh token, issues a new access token               |
| POST   | `/logout`              |     ✅      | Invalidates the refresh token, clears the cookie                   |
| GET    | `/me`                  |     ✅      | Returns the current authenticated user                             |
| POST   | `/verify-email`        |     ❌      | Verifies a user's email using the token from the verification link |
| POST   | `/resend-verification` |    ✅/❌    | Re-sends the verification email                                    |
| POST   | `/forgot-password`     |     ❌      | Sends a password-reset link to the given email                     |
| POST   | `/reset-password`      |     ❌      | Resets the password using the token from the reset link            |

### Example — Login

**Request**

```json
POST /api/v1/auth/login
{
  "email": "rakesh@example.com",
  "password": "SecurePass123"
}
```

**Response — 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "665f...",
      "firstName": "Rakesh",
      "email": "rakesh@example.com"
    },
    "accessToken": "eyJhbGciOi..."
  }
}
```

`Set-Cookie: refreshToken=...; HttpOnly; Path=/; Max-Age=604800`

---

## Users (`/users`)

| Method | Endpoint           | Auth | Description                                                                                                               |
| ------ | ------------------ | :--: | ------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`                |  ✅  | List users — supports `page`, `limit`, `search`, `sort`, `fields` (select), `populate` query params via the Query Builder |
| GET    | `/:id`             |  ✅  | Get a single user by ID                                                                                                   |
| PATCH  | `/profile`         |  ✅  | Update the current user's profile (name, email, etc.)                                                                     |
| PATCH  | `/change-password` |  ✅  | Change the current user's password                                                                                        |
| PATCH  | `/change-role`     |  ✅  | Change a user's role (admin action)                                                                                       |
| DELETE | `/:id`             |  ✅  | Delete a user                                                                                                             |

### Example — List Users

**Request**

```
GET /api/v1/users?page=2&limit=10&search=rakesh&sort=-createdAt&fields=firstName,email
```

**Response — 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": {
    "results": [
      { "id": "665f...", "firstName": "Rakesh", "email": "rakesh@example.com" }
    ],
    "pagination": {
      "page": 2,
      "limit": 10,
      "totalResults": 42,
      "totalPages": 5
    }
  }
}
```

See [`12-Query-Builder.md`](./12-Query-Builder.md) for the full list of supported query params.

---

## User File Uploads (`/users`)

| Method | Endpoint             | Auth | Description                                                                           |
| ------ | -------------------- | :--: | ------------------------------------------------------------------------------------- |
| POST   | `/avatar`            |  ✅  | Upload/replace the current user's avatar (processed via `image.processor.js`)         |
| DELETE | `/avatar`            |  ✅  | Remove the current user's avatar                                                      |
| POST   | `/gallery`           |  ✅  | Upload one or more gallery images                                                     |
| DELETE | `/gallery/:fileId`   |  ✅  | Delete a specific gallery image                                                       |
| POST   | `/documents`         |  ✅  | Upload one or more documents                                                          |
| DELETE | `/documents/:fileId` |  ✅  | Delete a specific document                                                            |
| POST   | `/videos`            |  ✅  | Upload a video — processed via `video.processor.js` (thumbnail + metadata extraction) |
| DELETE | `/videos/:fileId`    |  ✅  | Delete a specific video                                                               |

### Example — Upload Avatar

**Request**

```
POST /api/v1/users/avatar
Content-Type: multipart/form-data
Authorization: Bearer <accessToken>

file: <binary>
```

**Response — 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar": {
      "storage": "cloudinary",
      "url": "https://res.cloudinary.com/.../avatar.webp",
      "publicId": "users/avatar/abc123",
      "filename": "abc123",
      "mimeType": "image/webp",
      "size": 24576
    }
  }
}
```

Full architecture of this system: [`13-File-Upload-System.md`](./13-File-Upload-System.md).

---

## Health

| Method | Endpoint  | Auth | Description                                   |
| ------ | --------- | :--: | --------------------------------------------- |
| GET    | `/health` |  ❌  | Returns server + database connectivity status |

**Response — 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": { "uptime": 1234.5, "database": "connected" }
}
```

---

## Common Error Shape

Every error across every endpoint follows this shape (see [`06-Error-Handling.md`](./06-Error-Handling.md)):

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

## Rate Limits

- General API routes: governed by `API_RATE_LIMIT_WINDOW_MS` / `API_RATE_LIMIT_MAX`.
- Auth routes (login/register/forgot-password): governed by the stricter `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX`.
- Exceeding a limit returns `429 Too Many Requests` in the same error shape above.
