class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something Went Wrong!!",
    errors = [],
    statck = ""
  ) {
    super(message)
    this.statusCode = statusCode
    this.data = null
    this.message = message
    this.success = false
    this.errors = errors

    if (statck) {
        this.statck = statck
    }
    else {
        Error.captureStackTrace(this, this.constructor)
    }
  }
}

export {ApiError}
const api = new ApiError()
console.log(api);
