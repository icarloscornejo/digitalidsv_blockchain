var CryptoJS = require("crypto-js");

var index = 0; 																		//first block
var timestamp = 1516971600; 														//1:00pm elaniin blockchain hackaton begins
var data = {init: "Digital ID SV Genesis Block"}; 									//Proyect name
var previousHash = "0"; 															//there isn't a block behind zero
var hash = CryptoJS.SHA256(index + previousHash + timestamp + data).toString(); 	//genesis hash

class GenesisBlock {
    constructor() {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = hash;
    }
}

module.exports = GenesisBlock;