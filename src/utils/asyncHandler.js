const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
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