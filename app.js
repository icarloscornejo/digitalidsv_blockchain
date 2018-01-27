const Block = require("./environment/block.js");
const GenesisBlock = require("./environment/genesis_block.js");
const HTTPServer = require("./environment/http_server.js");
const P2PServer = require("./environment/p2p_server.js");

let miningDifficultyLevel = 4;

var sockets = [];
var fragments = [];
var blockchain = [new GenesisBlock()];

let httpServer = new HTTPServer();
let p2pServer = new P2PServer();


p2pServer.connectToPeers();
p2pServer.initializeServer(sockets, fragments, blockchain, httpServer);
httpServer.initializeServer(sockets, fragments, blockchain, p2pServer, miningDifficultyLevel);