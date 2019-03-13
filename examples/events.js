// Load the SDK
const MxwApi = require('mxw-sdk-js')

// Define all nodes from which SDK can choose one
const NODES = [
    'ws://node-1.testnet.space:26657',
    'ws://node-2.testnet.space:26657',
    'ws://node-3.testnet.space:26657',
    'ws://node-4.testnet.space:26657',
    'ws://node-5.testnet.space:26657',
    'ws://node-6.testnet.space:26657',
    'ws://node-7.testnet.space:26657',
    'ws://node-8.testnet.space:26657',
    'ws://node-9.testnet.space:26657',
    'ws://node-10.testnet.space:26657',
]

// Define the indexing service endpoint
const INDEXER = 'http://services.testnet.space:1234'

// Instantiate the SDK
const API = new MxwApi({
    nodes: NODES,
    indexer: INDEXER,
    backend: 'cosmos',
})

const delay = (ms = 1000) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms)
    })
}

// Subscribe to all transactions on the chain via websocket
API.events.onTx(data => {
    console.log(`Tx: ${data}`)
})

// Subscribe to all new blocks on the chain
API.events.onBlock(data => {
    console.log(`Block: ${data}`)
})

// Remove the tx handler
API.events.removeHandler('tx')