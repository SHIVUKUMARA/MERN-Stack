const app = require("./config/app");
const env = require("./config/env");
const connectDB = require("./database/mongodb");

/* server.js only does three jobs:

Load the Express app.
Connect to MongoDB.
Start listening for requests. */

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
