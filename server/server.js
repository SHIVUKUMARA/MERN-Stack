const app = require("./config/app");
const env = require("./config/env");
const connectDB = require("./database/mongodb");

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
