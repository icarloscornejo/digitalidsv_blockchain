var CryptoJS    = require("crypto-js");
var WebSocket 	= require("ws");
var express 	= require("express");
var bodyParser 	= require('body-parser');
const Block 	= require("./block.js");

var MessageTypes = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2,
    RESPONSE_FRAGMENT: 3,
    QUERY_ALL_FRAGMENTS: 4,
    CLEAR_FRAGMENTS: 5,
    NEW_NODE: 6
};
var http_port 		= process.env.HTTP_PORT || 3001;

class HTTPServer {
	initializeServer(sockets, fragments, blockchain, p2pServer, difficulty) {
		this.sockets = sockets;
		this.fragments = fragments;
		this.blockchain = blockchain;
		this.p2pServer = p2pServer;
		this.difficulty = difficulty;
		this.keepMining = false;
	    var app = express();
	    
	    app.use(bodyParser.json());

	    app.get('/blocks', (req, res) => {
	    	res.setHeader('Content-Type', 'application/json');
	    	res.send(JSON.stringify(blockchain));
	    });

	    app.post('/addFragment', (req, res) => {
	        var newFragment = req.body;
	        newFragment.timestamp = new Date().getTime() / 1000;
	        this.addFragment(newFragment);
	        this.broadcast(this.responseLatestFragment());
	        console.log('New fragment added to the queue: ' + JSON.stringify(newFragment));
	        res.send();
	    });

	    app.get('/fragments', (req, res) => {
	        res.setHeader('Content-Type', 'application/json');
	    	res.send(JSON.stringify(this.fragments));
	    });

	    app.get('/mineBlock', (req, res) => {
	    	var newF = [];
	    	var newFragments = newF.concat(this.fragments);
	        var newBlock = this.generateNextBlock(newFragments);
	        this.keepMining = true;
	        if(this.mineBlock(newBlock)){
	        	this.addBlock(newBlock);
		        this.broadcast(this.responseLatestMsg());
		        this.clearFragments(true);
		        this.broadcast(this.clearFragmentsMsg());
		        console.log('New block added to chain: ' + JSON.stringify(newBlock));
		        this.keepMining = false;
	        }
	        res.send();
	    });

	    app.get('/peers', (req, res) => {
	        res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
	    });

	    app.get('/cancel', (req, res) => {
	    	this.cancelMining();
	        res.send();
	    });

	    app.post('/addPeer', (req, res) => {
	        this.p2pServer.connectToPeers([req.body.peer]);
	        res.send();
	    });

	    app.listen(http_port, () => console.log('Digital ID SV disponible en el puerto: ' + http_port + '.'));
	}

	generateNextBlock(blockData) {
	    var previousBlock = this.getLatestBlock();
	    var nextIndex = previousBlock.index + 1;
	    var nextTimestamp = new Date().getTime() / 1000;
	    var nextHash = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, 0);
	    return new Block(nextIndex, nextTimestamp, blockData, previousBlock.hash, nextHash);
	}

	mineBlock(block) {
		console.log("-----");
		console.log("Mining block.");
		console.log("-----");
        while (block.hash.substring(0, this.difficulty) !== Array(this.difficulty + 1).join("0") && this.keepMining) {
            block.nonce++;
            block.hash = this.calculateHashForBlock(block);
        }

        console.log("Result: "+this.keepMining);
        return this.keepMining;
    }

    cancelMining(){
    	this.keepMining = false;
    }

	addBlock(newBlock) {
	    if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
	        this.blockchain.push(newBlock);
	    }
	}

	getLatestBlock() {
		return this.blockchain[this.blockchain.length - 1];
	}

	addFragment(newFragment){
		this.fragments.push(newFragment);
		this.p2pServer.sincronizeFragments(this.fragments);
	}

	sincronizeFragments(fragments){
		this.fragments = fragments;
	}

	clearFragments(local){
		if(local){
			this.p2pServer.clearFragments(false);
		}
		this.fragments = new Array();
	}

	getLatestFragment() {
		return this.fragments[this.fragments.length - 1];
	}

	write(ws, message) {
		ws.send(JSON.stringify(message));
	}

	broadcast(message) {
		this.sockets.forEach(socket => this.write(socket, message))
	}

	calculateHashForBlock(block) {
	    return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.nonce);
	}

	calculateHash(index, previousHash, timestamp, data, nonce) {
	    return CryptoJS.SHA256(index + previousHash + timestamp + data + nonce).toString();
	}

	isValidNewBlock(newBlock, previousBlock) {
	    if (previousBlock.index + 1 !== newBlock.index) {
	        console.log('invalid index');
	        return false;
	    } else if (previousBlock.hash !== newBlock.previousHash) {
	        console.log('invalid previoushash');
	        return false;
	    } else if (this.calculateHashForBlock(newBlock) !== newBlock.hash) {
	        console.log(typeof (newBlock.hash) + ' ' + typeof this.calculateHashForBlock(newBlock));
	        console.log('invalid hash: ' + this.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
	        return false;
	    }
	    return true;
	}

	responseLatestMsg() {
		return {
		    'type': MessageTypes.RESPONSE_BLOCKCHAIN,
		    'data': JSON.stringify([this.getLatestBlock()])
		};
	}

	responseLatestFragment(){
		return {
		    'type': MessageTypes.RESPONSE_FRAGMENT,
		    'data': JSON.stringify(this.getLatestFragment())
		};
	}

	clearFragmentsMsg() {
		return {
			'type': MessageTypes.CLEAR_FRAGMENTS
		};
	}

	queryChainLengthMsg() {
		return {
			'type': MessageTypes.QUERY_LATEST
		};
	}
}

module.exports = HTTPServer;