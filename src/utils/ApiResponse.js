class ApiResponse {
    constructor(
        statusCode,
        data,
        message='Request successful',
    ) {
        this.statusCode = statusCode;
        this.data = data;
        this.success = statusCode < 400;
        this.message = message;
    }
}

export default ApiResponse;
