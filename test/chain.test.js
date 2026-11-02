const test = require("node:test");
const assert = require("node:assert");
const GenesisBlock = require("../environment/genesis_block.js");
const HTTPServer = require("../environment/http_server.js");
const P2PServer = require("../environment/p2p_server.js");

// Mines one block the way /mineBlock does, without starting any server
function mineOnTopOfGenesis(fragments) {
    const miner = new HTTPServer();
    miner.blockchain = [new GenesisBlock()];
    miner.difficulty = 2;
    miner.keepMining = true;
    const block = miner.generateNextBlock(fragments);
    assert.ok(miner.mineBlock(block));
    return block;
}

test("a peer accepts a block mined by another node", () => {
    const block = mineOnTopOfGenesis([{ name: "Ana", dui: "fragment-1" }]);
    const peer = new P2PServer();
    assert.ok(block.hash.startsWith("00"));
    assert.ok(peer.isValidNewBlock(block, new GenesisBlock()));
});

test("a peer rejects a block whose identity fragments were changed", () => {
    const block = mineOnTopOfGenesis([{ name: "Ana", dui: "fragment-1" }]);
    const tampered = { ...block, data: [{ name: "Mallory", dui: "fragment-1" }] };
    assert.strictEqual(new P2PServer().isValidNewBlock(tampered, new GenesisBlock()), false);
});

test("a peer accepts a valid chain starting at the genesis block", () => {
    const peer = new P2PServer();
    const block = mineOnTopOfGenesis([{ name: "Ana" }]);
    assert.ok(peer.isValidChain([new GenesisBlock(), block]));
});
