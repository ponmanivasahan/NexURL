const UrlShortnerService=require('../services/urlShortner');
const ApiResponse=require('../utils/response')
const {AppError}=require('../middleware/errorHandler');
class UrlController{
    async createShortUrl(req,res,next){
        try{
        const {url,customAlias,expiresAt}=req.body;
        const userId=req.user?.id;
        const result=await UrlShortnerService.createShortUrl(url,{
            userId,customAlias,expiresAt:expiresAt ? new Date(expiresAt) : null
        })

        return ApiResponse.created(res,{
            shortUrl:`${process.env.BASE_URL}/${result.shortCode}`,
            originalUrl:result.originalUrl,
            shortCode:result.shortCode,
            isCustom:result.isCustom,
            createdAt:result.createdAt,
            expiresAt:result.expiresAt
        },'URL shortened successfully');
        }
        catch(error){
          next (error);
        }
    }

    async getUserUrls(req,res,next){
        try{
          const userId=req.user.id;
          const {page=1,limit=10}=req.query;

          const result=await UrlShortnerService.getUserUrls(
            userId,parseInt(page),parseInt(limit)
          );
          
          return ApiResponse.paginated(
            res,result.urls.map(url=>({...url,shortUrl:`${process.env.BASE_URL}/${url.shortCode}`})),
            result.pagination
          )
        }
        catch(error){
          next(error);
        }
    }


    async deleteUrl(req,res,next){
        try{
          const {shortCode}=req.params;
          const userId=req.user.id;

          await UrlShortnerService.deleteUrl(shortCode,userId);

          return ApiResponse.success(res,null,'URL deleted successfully')
        }
        catch(error){
          next(error);
        }
    }

    async getUrlAnalytics(req,res,next){
      try {
        const {shortCode}=req.params;
        return ApiResponse.success(res,{
          message:'Analytics endpoint'
        });
      } catch (error) {
        next(error);
      }
    }
}

module.exports=new UrlController();