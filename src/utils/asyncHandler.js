//The purpose of this utility function is to handle errors that occur in asynchronous request handlers. When an error occurs in an async handler, it's not automatically caught by Express.js. Instead, the error is lost, and the request hangs indefinitely.
//The async handler utility function solves this problem by wrapping the original handler in a Promise and catching any errors that occur. If an error occurs, it's passed to the next function, which is a built-in Express.js function that triggers the error handling middleware.
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))  //promise is used here to catch the error
  }
}






export {asyncHandler}

//another way

// const asyncHandler = (func) => async (req, res, next) => {
//     try {
//         await func(req, res, next)
//     } catch (error) {
//         res.status(err.coode || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }