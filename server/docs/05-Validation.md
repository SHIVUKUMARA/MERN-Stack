# 05 — Validation

All request validation uses **Zod**, organized per domain in `validators/`, applied through the shared `validators/validate.middleware.js`.

## Files

| File                                | Validates                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validators/auth.validator.js`      | Register, login, forgot-password, reset-password, verify-email payloads                                                                                 |
| `validators/user.validator.js`      | User CRUD payloads (create/update by an admin)                                                                                                          |
| `validators/profile.validator.js`   | Self-service profile updates (name/email change, password change)                                                                                       |
| `validators/validate.middleware.js` | Generic middleware — takes any Zod schema, validates `req.body` (or `query`/`params` as needed), and throws a formatted `ApiError(400, ...)` on failure |

## Example

```js
// validators/auth.validator.js
const { z } = require("zod");

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters long"),
});

module.exports = { registerSchema };
```

```js
// validators/validate.middleware.js
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new ApiError(400, firstError.message, result.error.errors);
  }

  req.body = result.data;
  next();
};
```

## Usage in routes

```js
router.post("/register", validate(registerSchema), authController.register);
router.patch(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  userController.changePassword,
);
```

## Why Zod

Chosen over `express-validator` for a single declarative schema per payload (rather than chained field-by-field checks), consistent error output, and the ability to reuse/extend schemas (e.g. a `baseUserSchema` extended by both create and update schemas).

## Error Shape

Every validation failure is converted by the global error middleware into:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```
