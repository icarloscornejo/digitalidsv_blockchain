var WebSocket 		= require("ws");
const GenesisBlock 	= require("./genesis_block.js");

var MessageTypes = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2,
    RESPONSE_FRAGMENT: 3,
    QUERY_ALL_FRAGMENTS: 4,
    CLEAR_FRAGMENTS: 5,
    NEW_NODE: 6
};
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers 	= process.env.PEERS ? process.env.PEERS.split(',') : [];

class P2PServer {
	initializeServer(sockets, fragments, blockchain, httpServer) {
		this.sockets = sockets;
		this.fragments = fragments;
		this.blockchain = blockchain;
		this.httpServer = httpServer;
	    var server = new WebSocket.Server({port: p2p_port});
	    server.on('connection', ws => this.initConnection(ws));
	    console.log('Escuchando websockets p2p en el puerto: ' + p2p_port);
	}

	initMessageHandler(ws) {
	    ws.on('message', (data) => {
	        var message = JSON.parse(data);
	        console.log('Received message' + JSON.stringify(message));
	        switch (message.type) {
	            case MessageTypes.QUERY_LATEST:
	                this.write(ws, this.responseLatestMsg());
	                break;
	            case MessageTypes.QUERY_ALL:
	                this.write(ws, this.responseChainMsg());
	                break;
	            case MessageTypes.RESPONSE_BLOCKCHAIN:
	                this.handleBlockchainResponse(message);
	                break;
	            case MessageTypes.RESPONSE_FRAGMENT:
	            	this.handleFragmentResponse(message);
	            	break;
	            case MessageTypes.QUERY_ALL_FRAGMENTS:
	                this.write(ws, this.responseQueueMsg());
	                break;
	            case MessageTypes.CLEAR_FRAGMENTS:
	                this.handleFragmentResponse("clear");
	                break;
	            case MessageTypes.NEW_NODE:
	            	this.write(ws, this.responseQueueMsg());
	            	break;
	        }
	    });
	}

	initErrorHandler(ws) {
	    var closeConnection = (ws) => {
	        console.log('connection failed to peer: ' + ws.url);
	        this.sockets.splice(this.sockets.indexOf(ws), 1);
	    };
	    ws.on('close', () => closeConnection(ws));
	    ws.on('error', () => closeConnection(ws));
	}

	initConnection(ws) {
	    this.sockets.push(ws);
	    this.initMessageHandler(ws);
	    this.initErrorHandler(ws);
	    this.write(ws, this.queryChainLengthMsg());
	    this.write(ws, this.queryQueue());
	}

	connectToPeers(peers = undefined) {
		if(peers == undefined){
			peers = initialPeers;
		}

	    peers.forEach((peer) => {
	        var ws = new WebSocket(peer);
	        ws.on('open', () => this.initConnection(ws));
	        ws.on('error', () => {
	            console.log('Connection failed.')
	        });
	    });
	}

	write(ws, message) {
        ws.send(JSON.stringify(message));
    }

    broadcast(message) {
        this.sockets.forEach(socket => this.write(socket, message))
    }

    calculateHashForBlock(block) {
	    return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data);
	}

	calculateHash(index, previousHash, timestamp, data) {
	    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
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

	handleBlockchainResponse(message) {
	    var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
	    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
	    var latestBlockHeld = this.getLatestBlock();
	    if (latestBlockReceived.index > latestBlockHeld.index) {
	        console.log('Our blockchain is possibly behind; We got: ' + latestBlockHeld.index + ' blocks,  Peer got: ' + latestBlockReceived.index + ' blocks');
	        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
	            console.log("We can append the received block to our chain.");
	            this.httpServer.cancelMining();
	            this.blockchain.push(latestBlockReceived);
	            this.broadcast(this.responseLatestMsg());
	        } else if (receivedBlocks.length === 1) {
	            console.log("We have to broadcast the chain from our peer.");
	            this.broadcast(this.queryAllMsg());
	        } else {
	            console.log("Received blockchain is longer than current blockchain, replacing chain.");
	            this.httpServer.cancelMining();
	            this.replaceChain(receivedBlocks);
	        }
	    } else {
	    	if(latestBlockReceived.timestamp < latestBlockHeld.timestamp){
	    		this.blockchain.pop();
	    		this.blockchain.push(latestBlockReceived);
	    		this.broadcast(this.responseLatestMsg());
	    	}else{
	    		console.log('Received blockchain is not longer than current blockchain.');
	    	}
	    }
	}

	handleFragmentResponse(message) {
		if(message == "clear"){
			this.clearFragments(true);
		}else{
			var receivedFragments = JSON.parse(message.data);
			if(Array.isArray(receivedFragments)){
				if(receivedFragments.length > this.fragments.length){
					if(receivedFragments.length == (this.fragments.length + 1)){
						console.log("1 We can append the received fragment to our queue.");
			            this.pushFragment(receivedFragments[receivedFragments.length-1]);
			            this.broadcast(this.responseLatestFragment());
					} else {
			            console.log("Received queue is longer than current queue, replacing queue.");
			            this.replaceQueue(receivedFragments);
			        }
				} else if(receivedFragments.length === 1){
					console.log("We have to broadcast the fragments from our peer.");
					this.broadcast(this.queryAllFragments());
				}else{
					console.log('Received queue is not longer than current queue.');
				}
			}else{
				if(this.fragments.length == 0){
					console.log("2 We can append the received fragment to our queue.");
					this.pushFragment(receivedFragments);
				}else if(JSON.stringify(receivedFragments) != JSON.stringify(this.fragments[this.fragments.length-1])){
					console.log("3 We can append the received fragment to our queue.");
					this.pushFragment(receivedFragments);
				}else{
					console.log("Received fragment is rejected.");
				}
			}
		}
	}

	pushFragment(newFragment) {
		this.fragments.push(newFragment);
		this.httpServer.sincronizeFragments(this.fragments);
	}

	sincronizeFragments(fragments){
		this.fragments = fragments;
	}

	replaceChain(newBlocks) {
	    if (this.isValidChain(newBlocks) && newBlocks.length > this.blockchain.length) {
	        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain.');
	        this.blockchain = newBlocks;
	        this.broadcast(this.responseLatestMsg());
	    } else {
	        console.log('Received blockchain is invalid.');
	    }
	}

	replaceQueue(newFragments) {
	    if (newFragments.length > this.fragments.length) {
	        console.log('Received queue is valid. Replacing current queue with received queue.');
	        this.fragments = newFragments;
	        this.sincronizeFragments(this.fragments);
	        this.broadcast(this.responseLatestFragment());
	    } else {
	        console.log('Received queue is invalid.');
	    }
	}

	isValidChain(blockchainToValidate) {
	    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(new GenesisBlock())) {
	        return false;
	    }
	    var tempBlocks = [blockchainToValidate[0]];
	    for (var i = 1; i < blockchainToValidate.length; i++) {
	        if (this.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
	            tempBlocks.push(blockchainToValidate[i]);
	        } else {
	            return false;
	        }
	    }
	    return true;
	}

	getLatestBlock() {
		return this.blockchain[this.blockchain.length - 1];
	}

	getLatestFragment() {
		return this.fragments[this.fragments.length - 1];
	}

	queryChainLengthMsg() {
		return {
			'type': MessageTypes.QUERY_LATEST
		};
	}

	queryQueue() {
		return {
			'type': MessageTypes.NEW_NODE
		};
	}

	queryAllMsg() {
		return {
			'type': MessageTypes.QUERY_ALL
		};
	}

	queryAllFragments() {
		return {
			'type': MessageTypes.QUERY_ALL_FRAGMENTS
		};
	}

	clearFragments(local){
		if(local){
			this.httpServer.clearFragments(false);
		}
		this.fragments = new Array();
	}

	responseChainMsg() {
		return {
		    'type': MessageTypes.RESPONSE_BLOCKCHAIN, 
		    'data': JSON.stringify(this.blockchain)
		};
	}

	responseQueueMsg() {
		return {
		    'type': MessageTypes.RESPONSE_FRAGMENT, 
		    'data': JSON.stringify(this.fragments)
		};
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
}

module.exports = P2PServer;