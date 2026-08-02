const app = require("./config/app");
const env = require("./config/env");
const connectDB = require("./database/mongodb");
const logger = require("./logger/index");

/* server.js only does three jobs:

Load the Express app.
Connect to MongoDB.
Start listening for requests. */

process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT EXCEPTION");
  logger.error(error);

  process.exit(1);
});
let server;

process.on("unhandledRejection", (error) => {
  logger.error("UNHANDLED REJECTION");
  logger.error(error);

  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Once app.listen() starts, every incoming request is handed to the Express application created in config/app.js
const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.port, () => {
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
