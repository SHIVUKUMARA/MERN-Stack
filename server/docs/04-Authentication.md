# 04 — Authentication

Covers registration, login, JWT access/refresh tokens with rotation, protected routes, logout, current user, email verification, and forgot/reset password.

## Token Strategy

- **Access Token** — short-lived JWT, returned in the response body, sent by the client via `Authorization: Bearer <token>`.
- **Refresh Token** — long-lived JWT, stored in an **httpOnly** cookie, used only to obtain a new access token.
- **Rotation** — every time the refresh token is used, it is invalidated and replaced with a new one, limiting the usefulness of a stolen token.

## Register (`POST /api/v1/auth/register`)

1. Body validated by `auth.validator.js` (Zod) via `validate.middleware.js`.
2. `auth.service.js` checks the email isn't already registered.
3. Password hashed with `bcrypt`.
4. User created via `User.js` model.
5. An email-verification token is generated and an email sent via `utils/email.js` (Mailtrap).
6. `ApiResponse` returned (password excluded).

## Login (`POST /api/v1/auth/login`)

1. Body validated (email/password).
2. Protected by `auth.rateLimit.js` to slow brute-force attempts.
3. User looked up by email; password compared via `bcrypt.compare`.
4. On success: access + refresh tokens generated, refresh token set as an httpOnly cookie, access token returned in the JSON body.

## Protected Routes

`middleware/auth.middleware.js` (`protect`):

1. Reads the access token from the `Authorization` header.
2. Verifies it; on success attaches `req.user` and calls `next()`.
3. On failure throws `ApiError(401, ...)`.

```js
router.get("/me", protect, authController.getCurrentUser);
```

## Refresh Token (`POST /api/v1/auth/refresh-token`)

1. Reads the refresh token from the httpOnly cookie.
2. Verifies it against the refresh-token secret.
3. **Rotates**: invalidates the old refresh token, issues a new access + refresh pair, sets the new cookie.

## Logout (`POST /api/v1/auth/logout`)

1. Protected route.
2. Invalidates the stored refresh token reference for the user.
3. Clears the refresh-token cookie.

## Current User (`GET /api/v1/auth/me`)

Protected route — returns the profile of the user attached to `req.user` by `protect`.

## Email Verification

1. On registration, a verification token (and/or link) is generated and emailed via Mailtrap.
2. `POST /api/v1/auth/verify-email` — the client submits the token; on success the user's `isEmailVerified` (or equivalent) flag is set.
3. `POST /api/v1/auth/resend-verification` — regenerates and re-sends the verification email if the original expired or wasn't received.

## Forgot / Reset Password

```
POST /forgot-password
        │
        ▼
Generate reset token → store hashed version + expiry on the user
        │
        ▼
Email reset link (containing the raw token) via Mailtrap
        │
        ▼
User clicks link → frontend calls POST /reset-password with token + new password
        │
        ▼
Token verified against stored hash + expiry → password updated → token cleared
```

- `POST /api/v1/auth/forgot-password` — takes an email, generates a reset token, emails a reset link. Always returns a generic success message regardless of whether the email exists, to avoid leaking which emails are registered.
- `POST /api/v1/auth/reset-password` — takes the token + new password, validates the token hasn't expired, hashes and saves the new password, invalidates the token.

## Rate Limiting on Auth Routes

`middleware/rateLimit/auth.rateLimit.js` applies a stricter limit (lower request count per window) specifically to `login`, `register`, `forgot-password`, and similar sensitive endpoints — separate from the general `api.rateLimit.js` applied elsewhere — since these are the routes most attractive to brute-force/credential-stuffing attempts.

## Full Sequence

```
Client                                  Server                          Mongo/Mailtrap
  │──POST /register───────────────────▶│                                   │
  │                                     │─hash password, save user────────▶│
  │                                     │─send verification email─────────▶│ (Mailtrap)
  │◀─201 Created────────────────────────│                                   │
  │                                     │                                   │
  │──POST /verify-email────────────────▶│─validate token, mark verified────▶│
  │◀─200 OK─────────────────────────────│                                   │
  │                                     │                                   │
  │──POST /login───────────────────────▶│─verify credentials───────────────▶│
  │◀─accessToken + refreshToken cookie──│                                   │
  │                                     │                                   │
  │──GET /me (Bearer token)────────────▶│─verify access token──────────────│
  │◀─user profile───────────────────────│                                   │
  │                                     │                                   │
  │──POST /refresh-token (cookie)──────▶│─rotate refresh token─────────────│
  │◀─new tokens──────────────────────────│                                   │
  │                                     │                                   │
  │──POST /forgot-password─────────────▶│─generate token, email link───────▶│ (Mailtrap)
  │──POST /reset-password──────────────▶│─validate token, update password──▶│
  │                                     │                                   │
  │──POST /logout (Bearer token)───────▶│─invalidate refresh token─────────│
  │◀─cookie cleared──────────────────────│                                   │
```
