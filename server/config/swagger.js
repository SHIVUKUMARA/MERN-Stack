const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    // This tells Swagger that our API documentation follows the OpenAPI 3 specification.
    openapi: "3.0.0",

    // Basic information displayed at the top of Swagger UI
    info: {
      title: "MERN Backend API",
      version: "1.0.0",
      description: "API documentation for the MERN backend.",
    },

    // This tells Swagger where the API base URL is.
    servers: [
      {
        url: "http://localhost/api/v1",
        description: "Development server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
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

        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "An error occurred",
            },
            errors: {
              type: "array",
              example: [],
              items: {},
            },
          },
        },

        File: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "507f1f77bcf86cd799439011",
            },

            storage: {
              type: "string",
              enum: ["local", "cloudinary", "s3", "azure", "gcs"],
              example: "cloudinary",
            },

            path: {
              type: "string",
              nullable: true,
              example: "uploads/users/avatar/profile.jpg",
            },

            url: {
              type: "string",
              format: "uri",
              example: "https://example.com/uploads/profile.jpg",
            },

            publicId: {
              type: "string",
              nullable: true,
              example: "users/avatar/profile",
            },

            resourceType: {
              type: "string",
              nullable: true,
              example: "image",
            },

            filename: {
              type: "string",
              example: "profile.jpg",
            },

            originalName: {
              type: "string",
              example: "my-profile.jpg",
            },

            mimeType: {
              type: "string",
              example: "image/jpeg",
            },

            extension: {
              type: "string",
              example: "jpg",
            },

            size: {
              type: "number",
              example: 245678,
              description: "File size in bytes",
            },

            width: {
              type: "number",
              nullable: true,
              example: 800,
            },

            height: {
              type: "number",
              nullable: true,
              example: 600,
            },

            isOptimized: {
              type: "boolean",
              example: false,
            },

            thumbnail: {
              type: "object",
              nullable: true,
              description: "Thumbnail information when available.",
            },

            uploadedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },

        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "507f1f77bcf86cd799439011",
            },

            firstName: {
              type: "string",
              example: "John",
            },

            lastName: {
              type: "string",
              example: "Doe",
            },

            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },

            role: {
              type: "string",
              enum: ["admin", "staff", "student"],
              example: "student",
            },

            avatar: {
              allOf: [
                {
                  $ref: "#/components/schemas/File",
                },
              ],
              nullable: true,
            },

            gallery: {
              type: "array",
              items: {
                $ref: "#/components/schemas/File",
              },
            },

            documents: {
              type: "array",
              items: {
                $ref: "#/components/schemas/File",
              },
            },

            videos: {
              type: "array",
              items: {
                $ref: "#/components/schemas/File",
              },
            },

            isActive: {
              type: "boolean",
              example: true,
            },

            isDeleted: {
              type: "boolean",
              example: false,
            },

            deletedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },

            createdAt: {
              type: "string",
              format: "date-time",
            },

            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },

        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              example: 1,
            },

            limit: {
              type: "integer",
              example: 10,
            },

            count: {
              type: "integer",
              example: 10,
              description: "Number of records returned on the current page.",
            },

            total: {
              type: "integer",
              example: 57,
              description: "Total number of matching records.",
            },

            totalPages: {
              type: "integer",
              example: 6,
            },

            hasNext: {
              type: "boolean",
              example: true,
            },

            hasPrev: {
              type: "boolean",
              example: false,
            },
          },
        },
      },
    },
  },

  // This tells swagger-jsdoc: Look inside JavaScript files in the routes directory and read the Swagger JSDoc comments.
  apis: ["./routes/**/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
