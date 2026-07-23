/* 
How It Works : Normally we throw errors like this: throw new Error("User not found");

The problem is: There is no HTTP status code.
Everything becomes:500 Internal Server Error
Instead we can now write:
throw new ApiError(
    404,
    "User not found"
);

Now the error contains:
{
    statusCode:404,
    message:"User not found"
}

Our error middleware will read that status code.
*/

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.statusCode = statusCode;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
