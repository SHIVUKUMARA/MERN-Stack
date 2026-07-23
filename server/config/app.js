const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const env = require("./env");

const app = express();

// Security Middleware

/* Helmet automatically adds several security-related HTTP headers.
For example, it helps protect against:
Clickjacking
MIME sniffing
Some XSS-related browser behaviors */
app.use(helmet());

// CORS Middleware
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);

// body or json parser - This parses HTML form submissions.
app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// cookie-parser
app.use(cookieParser());

// Request Logger - Logs every incoming request.
app.use(morgan("dev"));

/* request come from server.js --->>>, app.use(routes); ====>>>>> It tells Express:
"For every request that comes into this application, pass it to the main router."
Think of it like the reception desk in a company. */
const routes = require("../routes");
const notFound = require("../middleware/notFound.middleware");
const errorHandler = require("../middleware/error.middleware");

// The reception doesn't solve the customer's problem. It only forwards them to the correct department. --->>> routes.index.js
app.use(routes);
app.use(errorHandler);
app.use(notFound);

module.exports = app;
