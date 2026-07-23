const errorHandler = (err, req, res, next) => {
  /* 
  That first err parameter tells Express: "This middleware handles errors." 
  */
  console.log(err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
