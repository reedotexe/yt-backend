class ApiError extends Error {
    constructor(
        message='Something went wrong',
        statusCode,
        stack,
        errors=[]
    ){
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.success = false;
        this.message = message;
        this.errors = errors;
        
        if (stack) {
            this.stack = stack;
        } else{
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;
