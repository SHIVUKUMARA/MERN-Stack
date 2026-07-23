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

const routes = require("../routes");
/* request come from server.js --->>>, app.use(routes); ====>>>>> It tells Express:
"For every request that comes into this application, pass it to the main router."
Think of it like the reception desk in a company. */

app.use(routes); // The reception doesn't solve the customer's problem. It only forwards them to the correct department. --->>> routes.index.js

module.exports = app;
