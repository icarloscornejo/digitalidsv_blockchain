const calculateHash = require("./hash.js");

var index = 0; 																		//first block
var timestamp = 1516971600; 														//1:00pm elaniin blockchain hackaton begins
var data = {init: "Digital ID SV Genesis Block"}; 									//Proyect name
var previousHash = "0"; 															//there isn't a block behind zero
var nonce = 0;
var hash = calculateHash(index, previousHash, timestamp, data, nonce); 			//genesis hash

class GenesisBlock {
    constructor() {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = hash;
        this.nonce = nonce;
    }
}

module.exports = GenesisBlock;