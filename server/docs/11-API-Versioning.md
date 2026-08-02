# 11 — API Versioning Strategy

## What is versioned

The **route layer only** — `routes/v1/`. `controllers/`, `services/`, and `models/` are not versioned.

```js
// routes/v1/index.js mounts under:
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
```

## Why version APIs at all

Once an endpoint is consumed by a real client (frontend, mobile app), changing its request/response shape in place breaks every existing consumer. Versioning lets `/api/v1/...` keep its existing contract while `/api/v2/...` introduces a breaking change, so old clients keep working while new clients opt in.

## Why controllers/services aren't versioned yet

Versioning is about the **contract**, not the implementation. Most version bumps only need a different shape at the route/controller boundary — not different underlying business logic. Decision framework used in this project:

```
Does the API contract change?
        │
       Yes
        │
        ▼
  New route version (routes/v2/...)
        │
        ▼
  Does business logic also change?
        │
   ┌────┴────┐
   │         │
  No        Yes
   │         │
 Reuse     New versioned controller/service
 existing   (e.g. controllers/v2/auth.controller.js)
```

### Example: partial versioning

If only `login`'s contract changes in `v2`, only that handler gets duplicated:

```
routes/
    v1/auth.routes.js   → all endpoints, v1 login
    v2/auth.routes.js   → v2 login (new controller), everything else reused from v1

controllers/
    auth.controller.js      → register, logout, refresh, me, verify, reset
    v2/auth.controller.js   → login only
```

## Why this project currently keeps only `routes/v1/`

There are no existing public API consumers yet — nothing to stay backward-compatible with. Fully versioning `controllers/`, `services/`, and `models/` today would add navigation overhead for zero benefit. Keeping only routes versioned costs nothing now, and means a real `v2` can be introduced later without having to retroactively restructure URLs.

## Rule of thumb going forward

1. A requirement changes what a client sends/receives → consider a new route version.
2. Only version the specific controller/service that actually diverges — reuse everything else.
3. Don't pre-create version folders for layers that haven't diverged.

> Good architecture isn't the one with the most folders — it's the one that stays simple while still supporting future growth.