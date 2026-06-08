/**
 * Snowflake ID Generator
 * 
 * 64-bit unique ID structure:
 * | 1 bit reserved | 41 bits timestamp | 5 bits datacenter | 5 bits worker | 12 bits sequence |
 * 
 * Why Snowflake?
 * - Time-ordered (roughly sortable)
 * - Distributed (no coordination needed)
 * - High throughput (4096 IDs/ms per worker)
 * - Fits in BIGINT (database-friendly)
 * 
 * Twitter developed this for their distributed ID needs
 */

class Snowflake{
    constructor(datacenterId=0,workerId=0){
        // Epoch (2024-01-01 00:00:00 UTC)
        // We use a custom epoch to maximize the timestamp range
        this.EPOCH = 1704067200000n; // BigInt

        // Bit allocations
    this.DATACENTER_BITS = 5n;
    this.WORKER_BITS = 5n;
    this.SEQUENCE_BITS = 12n;
    
    // Maximum values
    this.MAX_DATACENTER_ID = (1n << this.DATACENTER_BITS) - 1n; // 31
    this.MAX_WORKER_ID = (1n << this.WORKER_BITS) - 1n; // 31
    this.MAX_SEQUENCE = (1n << this.SEQUENCE_BITS) - 1n; // 4095

    // Bit shifts
    this.WORKER_SHIFT = this.SEQUENCE_BITS; // 12
    this.DATACENTER_SHIFT = this.SEQUENCE_BITS + this.WORKER_BITS; // 17
    this.TIMESTAMP_SHIFT = this.SEQUENCE_BITS + this.WORKER_BITS + this.DATACENTER_BITS; // 22
    //Validate Inputs
    this.validateInput(datacenterId,workerId);

    //Initialize state
    this.datacenterId=BigInt(datacenterId);
    this.workerId=BigInt(workerId);
    this.sequence=0n;
    this.lastTimestamp=-1n;

    this.stats={
        generated:0,
        sequenceResets:0,
        clockBackwards:0
    }
    }
 /**
   * Validate datacenter and worker IDs
   */
  validateInput(datacenterId,workerId){
    if(datacenterId>Number(this.MAX_DATACENTER_ID) || datacenterId<0){
        throw new Error(`Datacenter ID must be between 0 and ${this.MAX_DATACENTER_ID}`)
    }
    if (workerId > Number(this.MAX_WORKER_ID) || workerId < 0) {
      throw new Error(
        `Worker ID must be between 0 and ${this.MAX_WORKER_ID}`
      );
    }
  }
/**
   * Generate the next unique ID
   * @returns {bigint} Unique Snowflake ID
   */
  async nextId() {
    let timestamp = this.currentTimestamp();
    
    // Handle clock moving backwards
    if (timestamp < this.lastTimestamp) {
      this.stats.clockBackwards++;
      const offset = this.lastTimestamp - timestamp;
      
      // If clock drift is small (less than 5ms), wait it out
      if (offset <= 5n) {
        await this.sleep(Number(offset) * 2);
        timestamp = this.currentTimestamp();
        
        if (timestamp < this.lastTimestamp) {
          throw new Error(
            `Clock moved backwards. Refusing to generate ID for ${offset}ms`
          );
        }
      } else {
        throw new Error(
          `Clock moved backwards by ${offset}ms. Refusing to generate ID`
        );
      }
    }
    
    // Same millisecond as last request
    if (timestamp === this.lastTimestamp) {
      // Increment sequence, with overflow check
      this.sequence = (this.sequence + 1n) & this.MAX_SEQUENCE;
      
      // Sequence exhausted for this millisecond
      if (this.sequence === 0n) {
        this.stats.sequenceResets++;
        // Wait until next millisecond
        timestamp = await this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      // New millisecond, reset sequence
      this.sequence = 0n;
    }
    
    this.lastTimestamp = timestamp;
    this.stats.generated++;
    
    // Construct the ID using bit shifting
    const id = 
      ((timestamp - this.EPOCH) << this.TIMESTAMP_SHIFT) |
      (this.datacenterId << this.DATACENTER_SHIFT) |
      (this.workerId << this.WORKER_SHIFT) |
      this.sequence;
    
    return id;
  }

  /**
   * Generate batch of IDs
   * @param {number} count - Number of IDs to generate
   * @returns {bigint[]} Array of unique IDs
   */
  async nextIds(count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
      ids.push(await this.nextId());
    }
    return ids;
  }

  /**
   * Get current timestamp in milliseconds as BigInt
   */
  currentTimestamp() {
    return BigInt(Date.now());
  }

  /**
   * Wait until next millisecond
   */
  async waitNextMillis(lastTimestamp) {
    let timestamp = this.currentTimestamp();
    while (timestamp <= lastTimestamp) {
      await this.sleep(1); // Wait 1ms
      timestamp = this.currentTimestamp();
    }
    return timestamp;
  }

  /**
   * Simple sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Deconstruct an ID into its components (for debugging)
   */
  parseId(id) {
    const timestamp = (BigInt(id) >> this.TIMESTAMP_SHIFT) + this.EPOCH;
    const datacenterId = (BigInt(id) >> this.DATACENTER_SHIFT) & this.MAX_DATACENTER_ID;
    const workerId = (BigInt(id) >> this.WORKER_SHIFT) & this.MAX_WORKER_ID;
    const sequence = BigInt(id) & this.MAX_SEQUENCE;
    
    return {
      timestamp: Number(timestamp),
      datetime: new Date(Number(timestamp)),
      datacenterId: Number(datacenterId),
      workerId: Number(workerId),
      sequence: Number(sequence)
    };
  }

  /**
   * Get statistics about generated IDs
   */
  getStats() {
    return {
      ...this.stats,
      currentSequence: Number(this.sequence),
      lastTimestamp: this.lastTimestamp === -1n ? null : Number(this.lastTimestamp)
    };
  }
}

// Create singleton instance
// In production, datacenterId and workerId would come from environment/config
const snowflake = new Snowflake(
  parseInt(process.env.DATACENTER_ID || '0'),
  parseInt(process.env.WORKER_ID || '0')
);

module.exports = Snowflake;
module.exports.snowflake = snowflake;