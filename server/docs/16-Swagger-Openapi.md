# Swagger API Documentation

This document explains how API documentation is implemented in this MERN backend using Swagger and OpenAPI.

It is written so that a developer who sees this project for the first time can understand:

- What Swagger is
- Why API documentation is needed
- What OpenAPI is
- How Swagger was installed
- How Swagger is configured in this project
- How API routes are documented
- How JWT authentication works in Swagger
- How request parameters and request bodies are documented
- How reusable schemas are created
- How file uploads are documented
- How to test APIs directly from Swagger UI
- How to document future APIs such as Products, Orders, Payments, etc.

## Table of Contents

1. [What Is Swagger?](#1-what-is-swagger)
2. [What Is OpenAPI?](#2-what-is-openapi)
3. [Packages Used](#3-packages-used)
4. [Installation](#4-installation)
5. [Swagger Project Structure](#5-swagger-project-structure)
6. [Swagger Configuration](#6-swagger-configuration)
7. [API Information](#7-api-information)
8. [Server Configuration](#8-server-configuration)
9. [Swagger UI Integration](#9-swagger-ui-integration)
10. [How Swagger Finds Route Documentation](#10-how-swagger-finds-route-documentation)
11. [Route Structure in This Project](#11-route-structure-in-this-project)
12. [Documenting an API](#12-documenting-an-api)
13. [Swagger Tags](#13-swagger-tags)
14. [Documenting GET All Users](#14-documenting-get-all-users)
15. [Pagination Parameters](#15-pagination-parameters)
16. [Search Parameters](#16-search-parameters)
17. [Sorting Parameters](#17-sorting-parameters)
18. [Field Selection](#18-field-selection)
19. [Filtering](#19-filtering)
20. [Advanced Filtering](#20-advanced-filtering)
21. [JWT Authentication](#21-jwt-authentication)
22. [Protecting an Endpoint in Swagger](#22-protecting-an-endpoint-in-swagger)
23. [Using the Authorize Button](#23-using-the-authorize-button)
24. [Reusable Response Schemas](#24-reusable-response-schemas)
25. [Error Response Schema](#25-error-response-schema)
26. [User Schema](#26-user-schema)
27. [File Schema](#27-file-schema)
28. [File Upload Documentation](#28-file-upload-documentation)
29. [Multiple File Uploads](#29-multiple-file-uploads)
30. [Request Body Documentation](#30-request-body-documentation)
31. [API Responses](#31-api-responses)
32. [Testing APIs from Swagger](#32-testing-apis-from-swagger)
33. [Example Workflow for Protected APIs](#33-example-workflow-for-protected-apis)
34. [Adding Future APIs](#34-adding-future-apis)
35. [When to Add New Schemas](#35-when-to-add-new-schemas)
36. [Recommended Documentation Pattern](#36-recommended-documentation-pattern)
37. [Important Project Principle](#37-important-project-principle)
38. [Current Swagger Architecture](#38-current-swagger-architecture)
39. [Summary](#39-summary)

---

## 1. What Is Swagger?

When building a backend API, the frontend developer or another backend developer needs to know:

- Which APIs are available
- Which HTTP method to use
- Which URL to call
- Which request body to send
- Which query parameters are supported
- Whether authentication is required
- What response will be returned
- What errors can occur

Without documentation, developers usually need to:

- Read the route files
- Read the controller files
- Read validators
- Guess request formats
- Use Postman to test everything manually

Swagger solves this problem by providing an interactive API documentation interface.

In this project, Swagger UI displays all documented APIs in the browser.

Example:

```
GET     /users
GET     /users/profile
PATCH   /users/profile
POST    /auth/login
POST    /auth/register
POST    /auth/refresh-token
```

Swagger also allows APIs to be tested directly from the browser.

## 2. What Is OpenAPI?

Swagger documentation follows the OpenAPI Specification.

OpenAPI is a standard format for describing APIs.

For example, an API definition can describe:

```
Path:
    /users

Method:
    GET

Authentication:
    Bearer JWT required

Query Parameters:
    page
    limit
    search
    sort

Response:
    JSON containing users and pagination
```

Swagger UI reads this information and generates a visual API documentation page.

This project uses:

- OpenAPI 3.0

## 3. Packages Used

The project uses two packages.

### swagger-jsdoc

This package reads Swagger documentation written inside JSDoc comments.

Example:

```js
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 */
```

swagger-jsdoc reads these comments and generates the OpenAPI specification.

### swagger-ui-express

This package displays the generated OpenAPI documentation in a browser.

Example:

```
http://localhost/api-docs
```

## 4. Installation

Install the required packages:

```bash
npm install swagger-jsdoc swagger-ui-express
```

## 5. Swagger Project Structure

Swagger was implemented without creating a separate folder for every API.

The project structure is:

```
server
│
├── config
│   ├── app.js
│   ├── env.js
│   └── swagger.js
│
├── routes
│   ├── index.js
│   │
│   └── v1
│       ├── index.js
│       ├── auth.routes.js
│       └── user.routes.js
│
└── ...
```

The main Swagger configuration is located at:

```
config/swagger.js
```

Swagger API documentation comments are written directly above the existing route definitions.

Example:

```
routes/v1/user.routes.js
routes/v1/auth.routes.js
```

This means documentation stays close to the API route it describes.

## 6. Swagger Configuration

The main configuration file is:

```
config/swagger.js
```

The file starts by importing swagger-jsdoc.

```js
const swaggerJsdoc = require("swagger-jsdoc");
```

Then the Swagger configuration is defined.

Basic structure:

```js
const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "MERN Backend API",
      version: "1.0.0",
      description: "API documentation for the MERN backend.",
    },

    servers: [],

    components: {
      securitySchemes: {},
      schemas: {},
    },
  },

  apis: ["./routes/**/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
```

## 7. API Information

The following section defines basic information displayed at the top of Swagger UI.

```js
info: {
  title: "MERN Backend API",
  version: "1.0.0",
  description: "API documentation for the MERN backend.",
},
```

Swagger displays this information as the API documentation title and description.

## 8. Server Configuration

This project uses API versioning.

The API routes start with:

```
/api/v1
```

Therefore the Swagger server configuration is:

```js
servers: [
  {
    url: "http://localhost/api/v1",
    description: "Development server",
  },
],
```

This is important because Swagger route documentation does not include the `/api/v1` prefix.

For example, the actual API URL is:

```
http://localhost/api/v1/users
```

But inside Swagger documentation we write:

```
/users
```

Because Swagger automatically combines:

```
Server URL
+
Documented Route

Result:

http://localhost/api/v1
+
/users
=
http://localhost/api/v1/users
```

## 9. Swagger UI Integration

Swagger UI is connected to the Express application inside:

```
config/app.js
```

The required packages are imported:

```js
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
```

Swagger UI is then registered:

```js
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

After starting the backend, Swagger documentation is available at:

```
http://localhost/api-docs
```

## 10. How Swagger Finds Route Documentation

The Swagger configuration contains:

```js
apis: ["./routes/**/*.js"],
```

This tells swagger-jsdoc:

- Search every JavaScript file
- inside the routes directory
- and all nested directories.

For example:

```
routes/index.js
routes/v1/index.js
routes/v1/auth.routes.js
routes/v1/user.routes.js
```

Swagger reads JSDoc comments containing:

```
@swagger
```

Example:

```js
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 */
```

## 11. Route Structure in This Project

The project uses nested routing.

The main routes are registered as:

```
/api/v1
```

Inside the version router:

```
/auth
/users
```

Therefore:

```
/api/v1/auth
/api/v1/users
```

For example:

```js
router.use("/auth", authRoutes);

router.use("/users", userRoutes);
```

Inside `user.routes.js`:

```js
router.get("/", ...);
```

The final API becomes:

```
GET /api/v1/users
```

But Swagger documents only:

```
/users
```

because `/api/v1` is already configured as the Swagger server base URL.

## 12. Documenting an API

Swagger documentation is written directly above the route.

Example:

```js
/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 */
router.get("/", protect, userController.getUsers);
```

This creates a Swagger endpoint under the Users section.

## 13. Swagger Tags

Tags are used to organize APIs.

Example:

```yaml
tags:
  - Users
```

All APIs with this tag appear together.

Example:

```
Users
├── GET /users
├── GET /users/profile
├── PATCH /users/profile
├── PATCH /users/profile/avatar
└── DELETE /users/profile/avatar
```

Authentication APIs use:

```yaml
tags:
  - Authentication
```

This allows Swagger to group APIs logically.

## 14. Documenting GET All Users

The backend supports:

- Pagination
- Search
- Filtering
- Sorting
- Field selection
- Population

The API route is:

```
GET /api/v1/users
```

Swagger documentation defines query parameters.

Example:

```yaml
parameters:
  - in: query
    name: page
    schema:
      type: integer
      minimum: 1
      default: 1
```

This represents:

```
?page=1
```

## 15. Pagination Parameters

The backend supports:

- page
- limit

Example:

```
GET /api/v1/users?page=1&limit=10
```

Swagger documentation:

```yaml
- in: query
  name: page
  description: Page number.
  schema:
    type: integer
    minimum: 1
    default: 1

- in: query
  name: limit
  description: Number of users per page.
  schema:
    type: integer
    minimum: 1
    maximum: 100
    default: 10
```

## 16. Search Parameters

The User query system supports searching:

- firstName
- lastName
- email

Example API:

```
GET /api/v1/users?search=john
```

Swagger documentation:

```yaml
- in: query
  name: search
  description: Search users by first name, last name, or email.
  schema:
    type: string
  example: john
```

## 17. Sorting Parameters

The backend supports sorting.

Example:

```
GET /api/v1/users?sort=-createdAt
```

The minus sign means descending order.

Swagger documentation:

```yaml
- in: query
  name: sort
  description: >
    Comma-separated fields used for sorting.
    Prefix a field with - for descending order.
  schema:
    type: string
    default: -createdAt
```

## 18. Field Selection

The backend allows selected fields to be returned.

Example:

```
GET /api/v1/users?fields=firstName,lastName,email
```

Swagger documentation:

```yaml
- in: query
  name: fields
  description: Comma-separated list of fields to include.
  schema:
    type: string
```

## 19. Filtering

The backend supports filtering using allowed fields.

Examples:

```
GET /api/v1/users?role=staff
GET /api/v1/users?isActive=true
```

Swagger documents each supported filter.

Example:

```yaml
- in: query
  name: role
  schema:
    type: string
    enum:
      - admin
      - staff
      - student
```

## 20. Advanced Filtering

The query system supports operators.

Example:

```
createdAt[gte]
createdAt[lte]
```

Example API:

```
GET /api/v1/users?createdAt[gte]=2026-01-01
```

Swagger documentation:

```yaml
- in: query
  name: createdAt[gte]
  description: Filter users created on or after the specified date.
  schema:
    type: string
    format: date
```

## 21. JWT Authentication

Protected APIs use JWT Bearer authentication.

The backend middleware expects:

```
Authorization: Bearer ACCESS_TOKEN
```

The Swagger configuration defines this authentication scheme.

```js
securitySchemes: {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  },
},
```

## 22. Protecting an Endpoint in Swagger

If an API requires authentication, add:

```yaml
security:
  - bearerAuth: []
```

Example:

```yaml
/users:
  get:
    security:
      - bearerAuth: []
```

Swagger then knows that the endpoint requires a JWT token.

## 23. Using the Authorize Button

Swagger UI provides an Authorize button.

The process is:

**Step 1** — Login using:

```
POST /auth/login
```

**Step 2** — Copy the returned access token.

**Step 3** — Click:

```
Authorize
```

**Step 4** — Enter the access token.

Example:

```
eyJhbGciOi...
```

**Step 5** — Click:

```
Authorize
```

Swagger automatically sends:

```
Authorization: Bearer ACCESS_TOKEN
```

for protected endpoints.

## 24. Reusable Response Schemas

The backend uses a standard successful response format through `ApiResponse`.

The response structure is:

```json
{
  "status": true,
  "statusCode": 200,
  "message": "Request successful",
  "data": {}
}
```

Instead of repeating this structure in every API documentation block, Swagger defines a reusable schema.

```js
SuccessResponse: {
  type: "object",
  properties: {
    status: {
      type: "boolean",
      example: true,
    },
    statusCode: {
      type: "integer",
      example: 200,
    },
    message: {
      type: "string",
      example: "Request successful",
    },
    data: {
      nullable: true,
    },
  },
},
```

Endpoints can then reuse it.

```yaml
schema:
  $ref: "#/components/schemas/SuccessResponse"
```

## 25. Error Response Schema

The backend uses a standard error response format.

Example:

```json
{
  "success": false,
  "message": "User not found",
  "errors": []
}
```

Swagger defines:

```
ErrorResponse
```

as a reusable schema.

Endpoints can use:

```yaml
schema:
  $ref: "#/components/schemas/ErrorResponse"
```

## 26. User Schema

The User schema represents user information returned by the API.

The backend User model contains fields such as:

```
_id
firstName
lastName
email
role
avatar
gallery
documents
videos
isActive
isDeleted
deletedAt
createdAt
updatedAt
```

Swagger contains a reusable:

```
User
```

schema.

Example:

```yaml
$ref: "#/components/schemas/User"
```

This allows future APIs to reuse the same User structure.

## 27. File Schema

The backend supports file uploads.

Files may use different storage providers:

```
local
cloudinary
s3
azure
gcs
```

The backend file structure contains information such as:

```
storage
path
url
publicId
resourceType
filename
originalName
mimeType
extension
size
width
height
isOptimized
thumbnail
uploadedAt
```

Swagger defines this structure once as:

```
File
```

Example:

```yaml
$ref: "#/components/schemas/File"
```

The User schema then reuses it.

## 28. File Upload Documentation

File upload APIs require:

```
multipart/form-data
```

For example, avatar upload uses:

```
PATCH /users/profile/avatar
```

The request body should contain:

```
avatar
```

as a file.

Swagger should describe this as:

```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          avatar:
            type: string
            format: binary
```

The important part is:

```
format: binary
```

This tells Swagger UI to display a file selection field.

## 29. Multiple File Uploads

For multiple files, Swagger uses an array.

Example:

```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          gallery:
            type: array
            items:
              type: string
              format: binary
```

This can be used for:

```
gallery
documents
videos
```

## 30. Request Body Documentation

POST, PUT, PATCH, and similar endpoints may require a request body.

Example registration request:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student"
}
```

Swagger documentation uses:

```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required:
          - firstName
          - lastName
          - email
          - password
        properties:
          firstName:
            type: string

          lastName:
            type: string

          email:
            type: string
            format: email

          password:
            type: string
            format: password
```

Swagger UI then provides an editable request body.

## 31. API Responses

Every endpoint should document its possible responses.

Example:

```yaml
responses:
  200:
    description: Users retrieved successfully

  401:
    description: Unauthorized
```

Successful responses use:

```yaml
$ref: "#/components/schemas/SuccessResponse"
```

Errors use:

```yaml
$ref: "#/components/schemas/ErrorResponse"
```

## 32. Testing APIs from Swagger

Swagger is not only documentation.

It can also be used to test APIs.

**Step 1** — Open:

```
http://localhost/api-docs
```

**Step 2** — Select an endpoint.

**Step 3** — Click:

```
Try it out
```

**Step 4** — Enter parameters or request body.

**Step 5** — Click:

```
Execute
```

Swagger sends the HTTP request to the backend.

Swagger displays:

- Request URL
- Request headers
- Request body
- Response status
- Response body

## 33. Example Workflow for Protected APIs

To test a protected endpoint:

**1. Register**

```
POST /auth/register
```

**2. Login**

```
POST /auth/login
```

**3. Copy the access token**

Example:

```
accessToken
```

**4. Click Authorize**

Paste the JWT token.

**5. Test protected APIs**

Example:

```
GET /users
GET /users/profile
PATCH /users/profile
```

Swagger automatically sends the Bearer token.

## 34. Adding Future APIs

When new modules are created, such as:

```
Products
Orders
Payments
Departments
Students
```

Swagger does not need to be redesigned.

For example, a future route:

```
routes/v1/product.routes.js
```

can contain:

```js
/**
 * @swagger
 * /products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products
 */
router.get("/", productController.getProducts);
```

Swagger automatically detects the new documentation because the configuration uses:

```js
apis: ["./routes/**/*.js"];
```

## 35. When to Add New Schemas

Reusable schemas should be added to:

```
config/swagger.js
```

inside:

```js
components: {
  schemas: {
    ...
  }
}
```

For example, when a Product model is created:

```
Product
```

can be added.

Future schemas may include:

```
Product
Order
Payment
Department
Student
Address
```

These schemas can then be reused across multiple endpoints.

## 36. Recommended Documentation Pattern

For every new API:

**1. Create the route**

Example:

```js
router.get("/", productController.getProducts);
```

**2. Add Swagger documentation directly above it**

```js
/**
 * @swagger
 * /products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products
 */
router.get("/", productController.getProducts);
```

**3. Add reusable schemas only if necessary**

If a new model is introduced, add its reusable schema to:

```
config/swagger.js
```

**4. Restart the backend**

Swagger will regenerate the documentation.

**5. Check**

```
http://localhost/api-docs
```

## 37. Important Project Principle

Swagger documentation should describe the API that actually exists.

Whenever an API changes, its Swagger documentation should also be updated.

For example, if:

```
PATCH /users/profile
```

changes its request body, update the Swagger documentation for that route.

Do not allow the documentation and implementation to become different.

## 38. Current Swagger Architecture

```
                Express Application
                        │
                        │
                        ▼
                 config/app.js
                        │
                        │
              /api-docs │
                        ▼
              swagger-ui-express
                        │
                        ▼
                 swaggerSpec
                        │
                        ▼
                config/swagger.js
                        │
                        │
          apis: ./routes/**/*.js
                        │
                        ▼
              ┌─────────────────┐
              │                 │
              ▼                 ▼
       auth.routes.js     user.routes.js
              │                 │
              ▼                 ▼
       @swagger docs      @swagger docs
              │                 │
              └────────┬────────┘
                       │
                       ▼
                 Swagger UI
```

## 39. Summary

Swagger was implemented in this project using:

```
swagger-jsdoc
+
swagger-ui-express
+
OpenAPI 3.0
```

The main configuration is:

```
config/swagger.js
```

Swagger UI is available at:

```
http://localhost/api-docs
```

API documentation is written directly above route definitions using:

```
@swagger
```

Reusable schemas are defined once and reused across APIs.

Current reusable schemas include:

```
SuccessResponse
ErrorResponse
File
User
Pagination
```

Protected APIs use:

```
Bearer JWT Authentication
```

Swagger can also be used to test APIs directly from the browser.

As the backend grows, new APIs such as Products, Orders, Payments, Departments, and Students can be documented by adding Swagger JSDoc comments directly to their route files.

### Final Principle

The route contains the implementation entry point, and the Swagger comment directly above it contains the documentation for that API.

This keeps API documentation close to the code and allows the Swagger documentation to grow naturally as the backend grows.
