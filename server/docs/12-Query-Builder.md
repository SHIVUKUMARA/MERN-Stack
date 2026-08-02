# 12 — Generic Query Builder

The `core/query/` system provides one reusable way to handle **pagination, search, filtering, sorting, field selection, and population** for any list endpoint in the app — implemented once, reused by every module (currently Users; will be reused by every future domain module).

## Why a generic query system?

Without it, every "list X" endpoint (`GET /users`, `GET /departments`, `GET /courses`, ...) would reimplement its own pagination/filter/sort logic. Instead, a controller just does:

```js
const result = await new QueryBuilder(User, req.query)
  .paginate()
  .search(["firstName", "lastName", "email"])
  .filter()
  .sort()
  .select()
  .populate()
  .execute();
```

## Architecture

```
req.query
   │
   ▼
core/query/QueryBuilder.js
   │
   ├── parsers/paginate.js   → page, limit
   ├── parsers/search.js     → text search across given fields
   ├── parsers/filter.js     → field-based filters
   ├── parsers/sort.js       → sort order
   ├── parsers/select.js     → field projection
   └── parsers/populate.js   → relational expansion
   │
   ▼
core/query/executors/MongooseExecutor.js
   │
   ▼
Mongoose model.find()/countDocuments()
   │
   ▼
{ results, pagination }
```

## Supported Query Params (typical convention)

| Param      | Example                   | Handled by    | Effect                                           |
| ---------- | ------------------------- | ------------- | ------------------------------------------------ |
| `page`     | `?page=2`                 | `paginate.js` | Which page of results                            |
| `limit`    | `?limit=10`               | `paginate.js` | Results per page                                 |
| `search`   | `?search=rakesh`          | `search.js`   | Text search across configured fields             |
| `<field>`  | `?role=admin`             | `filter.js`   | Exact/operator-based filtering on a field        |
| `sort`     | `?sort=-createdAt`        | `sort.js`     | Sort order; `-` prefix = descending              |
| `fields`   | `?fields=firstName,email` | `select.js`   | Restrict returned fields (projection)            |
| `populate` | `?populate=department`    | `populate.js` | Expand a referenced field into the full document |

## Why parsers and executors are separate

- **Parsers** only interpret `req.query` into a neutral query specification — they know nothing about MongoDB or Mongoose.
- **Executors** take that specification and actually run it against a specific data layer. `MongooseExecutor.js` is the only executor today, but the split means a different database/ORM could be supported later by adding a new executor, without touching any parser.

## Response Shape

Every list endpoint using the Query Builder returns the same shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resources fetched successfully",
  "data": {
    "results": [
      /* array of documents */
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

## Reusing it for a new module

Any future module (Department, Course, Student, ...) gets full pagination/search/filter/sort/select/populate support for free — the controller only needs to call `QueryBuilder` against its own model and specify which fields are searchable, exactly as `user.controller.js` does today.
