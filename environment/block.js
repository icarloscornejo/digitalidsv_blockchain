class Block {
    constructor(index, timestamp, data, previousHash, hash) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash.toString();
        this.hash = hash.toString();
        this.nonce = 0;
    }

    toString() {
    	return JSON.stringify({
    		index: this.index, 
    		timestamp: this.timestamp, 
    		data: JSON.stringify(this.data), 
    		previousHash: this.previousHash, 
    		hash: this.hash,
            nonce: this.nonce
    	});
    }
}

module.exports = Block;