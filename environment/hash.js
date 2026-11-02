var CryptoJS = require("crypto-js");

// One hash for the genesis block, mining and peer validation, so every node agrees on what a valid block is.
// JSON.stringify makes the hash cover the identity fragments; plain string concatenation turned them into "[object Object]".
function calculateHash(index, previousHash, timestamp, data, nonce) {
    return CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data) + nonce).toString();
}

module.exports = calculateHash;
