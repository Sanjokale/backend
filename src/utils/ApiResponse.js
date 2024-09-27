class ApiResponse {
    constructor (statusCode, data, message = "Success") {

        //fill the data to the class object
        this.statusCode = statusCode
        this.data = data
        this.message = message
    }
}

export {ApiResponse}