const env = require("./config/env");
const connectDB = require("./database/mongodb");
const { connectRedis, redisClient } = require("./database/redis");
const logger = require("./logger/index");

// /* server.js only does three jobs:

// Load the Express app.
// Connect to MongoDB.
// Start listening for requests. */

let server;
let closeQueue;

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
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress");
    return;
  }

  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          logger.info("HTTP server closed");
          resolve();
        });
      });
    }

    if (closeQueue) {
      await closeQueue();
      logger.info("BullMQ connections closed");
    }

    const mongoose = require("mongoose");

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    }

    if (redisClient.isOpen) {
      await redisClient.quit(); // quit() tells Redis: Finish processing the existing commands and then close the connection.
      logger.info("Redis connection closed");
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

// ==========================================================
// Start Server
// ==========================================================
// Once app.listen() starts, every incoming request is handed to the Express application created in config/app.js
const startServer = async () => {
  try {
    await connectDB();

    await connectRedis();

    // Start BullMQ
    const queueService = require("./services/queue.service");
    closeQueue = queueService.closeQueue;

    // Wait for the BullMQ Queue connection
    await queueService.emailQueue.waitUntilReady();

    logger.info("BullMQ email queue is ready");

    // Wait for the QueueEvents connection
    await queueService.emailQueueEvents.waitUntilReady();

    logger.info("BullMQ email QueueEvents is ready");

    const app = require("./config/app");

    server = app.listen(env.port, "0.0.0.0", () => {
      console.log("==========================================");
      console.log("Backend server is running on port :", env.port);
      console.log("Environment is : ", env.nodeEnv);
      console.log("==========================================");
    });
  } catch (error) {
    logger.error("Failed to start server");
    logger.error(error);
    console.error("Failed to start server");
    console.error(error);
  }
};

startServer();
