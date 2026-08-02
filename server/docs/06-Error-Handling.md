# 06 — Error Handling

A small, consistent set of utilities keeps every route's error handling uniform, avoiding scattered `try/catch` blocks and inconsistent response shapes.

## `utils/ApiError.js`

```js
class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
  }
}
```

Thrown anywhere:

```js
if (!user) throw new ApiError(404, "User not found");
```

## `utils/ApiResponse.js`

```js
class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
```

Used in controllers:

```js
return res.status(200).json(new ApiResponse(200, { user }, "Login successful"));
```

## `utils/asyncHandler.js`

```js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

Wraps every controller, forwarding any thrown/rejected error straight to `next()`.

## `middleware/notfound.middleware.js`

Catches requests to routes that don't exist and forwards a 404 `ApiError` to the error middleware. Mounted after all routers in `config/app.js`.

## `middleware/error.middleware.js`

The final catch-all — formats every error (validation, auth, not-found, unexpected) into one consistent JSON shape:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

Stack traces are only included when `NODE_ENV === "development"`.

## How it fits together

```
Controller throws / rejects
        │
        ▼
asyncHandler catches via .catch(next)
        │
        ▼
next(error) called
        │
        ▼
notfound.middleware.js skipped (not applicable) → error.middleware.js
        │
        ▼
Consistent JSON error response
```

## Why this matters

- One place (`error.middleware.js`) controls the final response shape for every error in the app — including from `core/query`, `services/upload`, validators, and auth.
- Combined with `logger/`, errors can also be logged centrally from this single middleware.
