class Base62{
    constructor(){
    this.CHARS='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.BASE=62;
//precompute character map for O(1) lookup
    this.charMap=new Map();
    for(let i=0;i<this.CHARS.length;i++){
        this.charMap.set(this.CHARS[i],i);
    }
 }
   /**
   * Encode a number to Base62 string
   * Time Complexity: O(log n) - number of divisions
   * Space Complexity: O(log n) - length of result
   * 
   * @param {number|bigint} num - Number to encode
   * @returns {string} Base62 encoded string
   */
 encode(num){
    if(num===0 || num===0n){
        return '0';
    }

    let n=typeof num==='bigint' ? num:BigInt(num);
    let result='';

    while(n>0n){
        const remainder=Number(n%BigInt(this.BASE))
        result=this.CHARS[remainder]+result;
        n=n/BigInt(this.BASE);
    }
    return result;
 }
 /**
   * Decode a Base62 string back to number
   * Time Complexity: O(n) where n is string length
   * Space Complexity: O(1)
   * 
   * @param {string} str - Base62 encoded string
   * @returns {bigint} Decoded number
   */

 decode(str){
    let result=0n;
    for(let i=0;i<str.length;i++){
        const char=str[i];
        if(!this.charMap.has(char)){
            throw new Error(`Invalid Base62 character: ${char}`);
        }
        result=result*BigInt(this.BASE)+BigInt(this.charMap.get(char));
    }
    return result;
 }

  /**
   * Generate a short code of specific length
   * Ensures minimum length by padding if needed
   * 
   * @param {number|bigint} num - Number to encode
   * @param {number} minLength - Minimum length of output
   * @returns {string} Padded Base62 string
   */

  encodeWithPadding(num,minlength=7){
    const encoded=this.encode(num);
    return encoded.padStart(minlength,'0');
  }

  /**
   * Validate if a string is valid Base62
   * @param {string} str - String to validate
   * @returns {boolean}
   */

  isValid(str){
    if(!str || str.length===0){
        return false;
    }
    return [...str].every(char=>this.charMap.has(char));
  }
}

const base62=new Base62();
module.exports=base62