/* 
Suppose we have:
exports.login = async (req, res) => {
    const user = await User.findOne();
};

If MongoDB throws an error, normally Express doesn't automatically catch async errors.
So people write:
try {
    const user = await User.findOne();
}
catch(error){
}
for every controller.
Instead: asyncHandler(async(req,res)=>{})

automatically catches every error, Internally
*/

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
