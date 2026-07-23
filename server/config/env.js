require("dotenv").config({ quiet: true }); //{ quiet: true } - to hide .env to print message to the terminal

module.exports = {
  nodeEnv: process.env.NODE_ENV,
  mongoUrl: process.env.MONGO_URI,
  port: process.env.PORT,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  clientUrl: process.env.CLIENT_URL,
};
