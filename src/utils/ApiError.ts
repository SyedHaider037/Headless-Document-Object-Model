class ApiError extends Error {
    public statusCode: number;
    public message: string;
    public data: any;
    public success: boolean;
    public error: any[];
    
    constructor(
        statusCode: number,
        message : string = "Something went wrong",
        error: any[] = [],
        stack = ""
    ) {
        super (message);
        this.name = this.constructor.name
        this.message = message;
        this.statusCode = statusCode;
        this.data = null;
        this.success = false;
        this.error = error;

        if (stack){
            this.stack = stack;
        }else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiError }