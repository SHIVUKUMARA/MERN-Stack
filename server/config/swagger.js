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
    },
  },

  // This tells swagger-jsdoc: Look inside JavaScript files in the routes directory and read the Swagger JSDoc comments.
  apis: ["./routes/**/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
