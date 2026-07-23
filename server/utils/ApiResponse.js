/* 
Why Use ApiResponse? -- Instead of
res.json({
    success:true,
    users,
    message:"Fetched"
});

every developer writes different responses.
Example:

Developer A
{
    "status":true
}
Developer B
{
    "success":true
}
Developer C
{
    "ok":true
}

Frontend developers now have to remember every format.
Instead we'll standardize every successful response.
*/

class ApiResponse {
  constructor(statusCode, data = null, message = "success") {
    this.status = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

module.exports = ApiResponse;
