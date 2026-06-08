const mysql=require('mysql2/promise');
require('dotenv').config();

class Database{
    constructor(){
        this.pool=null;
    }

    async initialize(){
        try{
            this.pool=mysql.createPool({
                host:process.env.DB_HOST,
                port:process.env.DB_PORT,
                user:process.env.DB_USER,
                password:process.env.DB_PASSWORD,
                database:process.env.DB_NAME,
                waitForConnections:true,
                connectionLimit:parseInt(process.env.DB_POOL_MAX),
                queueLimit:0,
                enableKeepAlive:true,
                keepAliveInitialDelay:0
            })

            const connection=await this.pool.getConnection();
            console.log('Database connected');
            connection.release();
            return this.pool;
        }
        catch(error){
            console.error('Database Connection Failed',error.message);
            throw error;
        }
    }

    async getConnection(){
        try{
           return await this.pool.getConnection();
        }
        catch(error){
           console.error('Error getting connection from pool:',error);
           throw error;
        }
    }

    async query(sql, params) {
    const start = Date.now();
    try {
      const [results] = await this.pool.execute(sql, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Query executed', { sql, duration, rows: results.length });
      }
      
      return results;
    } catch (error) {
      console.error('Query error:', { sql, error: error.message });
      throw error;
    }
  }

  async transaction(callback){
    const connection=await this.getConnection();
    try{
       await connection.beginTransaction();
       const result=await callback(connection);
       await connection.commit();
       return result;
    }
    catch(error){
       await connection.rollback();
       throw error;
    }
    finally{
        connection.release();
    }
  }
}

//singleton instance
const db=new Database();
module.exports=db;