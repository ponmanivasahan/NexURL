const db=require('../config/db')
const bcrypt=require('bcryptjs')
class User{
    constructor(){
        this.tableName='users';
        this.SALT_ROUNDS=12;
    }

    //create new user
    async create({username,email,password}){
        const passwordHash=await bcrypt.hash(password,this.SALT_ROUNDS);

        const query=`INSERT INTO ${this.tableName}(username,email,password_hash) VALUES(?,?,?)`;

        try{
            const result=await db.query(query,[username,email,passwordHash])
            return{
                id:result.insertId,
                username,email,
                createdAt:new Date()
            }
        }
        catch(error){
            if (error.code === 'ER_DUP_ENTRY') {
               if (error.message.includes('email')) {
                   throw new Error('Email already registered');
            }
            if (error.message.includes('username')) {
                 throw new Error('Username already taken');
            }
        }
        throw error;
     }
    }

    async findByEmail(email){
        const query=`SELECT id,username,email,password_hash,is_active,created_at
        FROM ${this.tableName} WHERE email=?`;

        const [user]=await db.query(query,[email]);
        return user || null;
    }

    async findByLoginIdentifier(identifier) {
      const query = `SELECT id,username,email,password_hash,is_active,created_at
      FROM ${this.tableName} WHERE email=? OR username=?`;

      const normalizedIdentifier = typeof identifier === 'string' ? identifier.trim() : identifier;
      const [user] = await db.query(query, [normalizedIdentifier, normalizedIdentifier]);
      return user || null;
    }

    async findById(id) {
    const query = `SELECT id, username, email, is_active, created_at
      FROM ${this.tableName}
      WHERE id = ? AND is_active = TRUE
    `;

    const [user] = await db.query(query,[id]);
    return user || null;
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async updatePassword(userId,newPassword){
    const password=await bcrypt.hash(newPassword,this.SALT_ROUNDS);

    const query = `
      UPDATE ${this.tableName}
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await db.query(query, [passwordHash, userId]);
    
    if (result.affectedRows === 0) {
      throw new Error('User not found');
    }
    
    return true;
  }

  async deactivate(userId){
    const query=`UPDATE ${this.tableName} SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE id=?`;
    const result=await db.query(query,[userId])

    if(result.affectedRows===0){
        throw new Error('User not found');
    }
    return true;
  }
}

module.exports=new User();