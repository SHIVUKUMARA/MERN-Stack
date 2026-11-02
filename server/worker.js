const logger = require("./logger");
const connectDB = require("./database/mongodb");

let closeWorker;

let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Shutting down email worker...`);

 try {
   if (closeWorker) {
     await closeWorker();
   }

   const mongoose = require("mongoose");
   await mongoose.connection.close();

   logger.info("Email worker shutdown completed");
   process.exitCode = 0;
 } catch (error) {
   logger.error("Email worker shutdown failed");
   logger.error(error);
   process.exitCode = 1;
 }
};

const startWorker = async () => {
  try {
    await connectDB();

    // Import only after MongoDB is connected.
    const emailWorkerService = require("./services/email.worker");
    closeWorker = emailWorkerService.closeWorker;

    logger.info("Email worker process started");
  } catch (error) {
    logger.error("Failed to start email worker");
    logger.error(error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error("Worker uncaught exception");
  logger.error(error);
  void shutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (error) => {
  logger.error("Worker unhandled rejection");
  logger.error(error);
  void shutdown("UNHANDLED_REJECTION");
});

startWorker();
