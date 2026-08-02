const morgan = require("morgan");
const logger = require("./index");

// Client IP
morgan.token("ip", (req) => req.ip);

// Loggedin User
morgan.token("user", (req) => {
  return req.user?.userId || "Guest";
});

// Request body as optional
morgan.token("body", (req) => {
  if (req.method === "GET") return "";
  return JSON.stringify(req.body);
});

const stream = {
  write: (message) => logger.info(message.trim()),
};

const requestLogger = morgan(
  ":method :url | :status | :response-time ms | IP: :ip | User: :user",
  {
    stream,
  },
);

module.exports = requestLogger;
