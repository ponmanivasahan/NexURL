class ApiResponse{
    static success(res,data=null,message='Success',statusCode=200){
        return res.status(statusCode).json({
            success:true,
            message,
            data,
            timestamp:new Date().toISOString()
        });
    }
    static created(res,data=null,message='Created successfully'){
        return this.success(res,data,message,201);
    }

    static error(res,message='Internal Server Error',statusCode=500,errors=null){
        return res.status(statusCode).json({
            success:false,
            message,
            errors,
            timestamp:new Date().toISOString()
        });
    }

    static badRequest(res,message='Bad Request',errors=null){
        return this.error(res,message,400,errors);
    }
    static unauthorized(res,message='Unauthorized'){
        return this.error(res,message,401);
    }
    static forbidden(res,message='Forbidden'){
        return this.error(res,message,403);
    }
    static notFound(res,message='Not Found'){
        return this.error(res,message,404);
    }

    static tooManyRequests(res,message='Too Many Requests'){
        return this.error(res,message,429);
    }

    static paginated(res,data,pagination){
        return res.status(200).json({
            success:true,
            message:'Success',
            data,
            pagination,
            timestamp:new Date().toISOString()
        });
    }
}
module.exports=ApiResponse