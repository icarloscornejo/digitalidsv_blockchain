# Digital ID SV Blockchain

A proof-of-work blockchain that stores a person's digital identity as fragments, synced between nodes over WebSockets. Built in Node.js at the Elaniin blockchain hackathon in San Salvador, in January 2018.

The idea: instead of one central database holding everyone's identity, each piece of it (a birth certificate, an address, an ID number) is added as a fragment, mined into a block, and replicated by every node in the network. Any node can read the chain, and no single node can rewrite it.

This is a hackathon prototype, kept as it was built, with a few fixes. It has no authentication and keeps everything in memory, so it is not meant for production.

## How it works

1. **Fragments queue up.** `POST /addFragment` adds an identity fragment to a pending queue, and the queue is broadcast to every connected peer.
2. **Mining seals them.** `GET /mineBlock` takes the queued fragments, builds the next block and searches for a nonce until the block's SHA-256 hash starts with four zeros (proof of work). Mining stops early if a peer finds the block first.
3. **Peers agree.** The new block is broadcast. Each peer checks the index, the link to the previous hash and the hash itself, including the nonce and the fragment data, before appending it. A peer that falls behind asks for the whole chain and replaces its own only if the received one is longer and valid from the genesis block.
## Run it

Requires Node.js 18 or later.

```sh
npm install
npm start
```

Start a second node on other ports and point it at the first one:

```sh
HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm start
```

Defaults: HTTP on port 3001, peer-to-peer WebSockets on port 6001.

## API

| Method | Endpoint | What it does |
| --- | --- | --- |
| GET | `/blocks` | The full chain, from the genesis block |
| POST | `/addFragment` | Adds an identity fragment (any JSON) to the queue |
| GET | `/fragments` | Fragments waiting for the next block |
| GET | `/mineBlock` | Mines the queued fragments into a new block |
| GET | `/cancel` | Stops the current mining |
| GET | `/peers` | Connected peers |
| POST | `/addPeer` | Connects to a peer: `{"peer": "ws://host:port"}` |

## Tests

```sh
npm test
```

They mine a block, check that a peer accepts it, and check that a peer rejects the same block after its identity data is changed.

## Credits

The peer-to-peer sync and block validation started from [naivechain](https://github.com/lhartikk/naivechain) by Lauri Hartikka (Apache License 2.0). On top of it, this project adds proof-of-work mining with cancellation, the identity fragment queue shared across peers, and the genesis block.

## License

MIT, for the code written for this project. The parts adapted from naivechain stay under the Apache License 2.0.
