const app = require("./config/app");
const env = require("./config/env");
const connectDB = require("./database/mongodb");
const logger = require("./logger/index");

/* server.js only does three jobs:

Load the Express app.
Connect to MongoDB.
Start listening for requests. */

let server;

process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT EXCEPTION");
  logger.error(error);

  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  logger.error("UNHANDLED REJECTION");
  logger.error(error);

  gracefulShutdown("UNHANDLED_REJECTION");
});

// ==========================================================
// Graceful Shutdown
// ==========================================================
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          logger.info("HTTP server closed");
          resolve();
        });
      });
    }

    const mongoose = require("mongoose");

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    }

    logger.info("Graceful shutdown completed");

    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown");
    logger.error(error);

    process.exit(1);
  }
};

// ==========================================================
// Container Shutdown Signals
// ==========================================================
process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});

process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

// Once app.listen() starts, every incoming request is handed to the Express application created in config/app.js
const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.port, "0.0.0.0", () => {
      console.log("==========================================");
      console.log("Backend server is running on port :", env.port);
      console.log("Environment is : ", env.nodeEnv);
      console.log("==========================================");
    });
  } catch (error) {
    console.error("Failed to start server");
    console.error(error);
  }
};

startServer();
