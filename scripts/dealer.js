const WebSocket = require('ws');
const crypto = require('crypto');

const server = new WebSocket.Server({ port: 8080 });

let clients = [];
let dealerIndex = 0;

const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

function createDeck() {
    let deck = [];
    for (let suit = 0; suit < suits.length; suit++) {
        for (let value of values) {
            deck.push([value, suit]);
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    let shuffledDeck = deck.slice();
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    return shuffledDeck;
}

function dealCards(deck) {
    let hands = {};
    for (let i = 0; i < clients.length; i++) {
        hands[clients[i].id] = [deck.pop(), deck.pop()];
    }
    return hands;
}

function startRound() {
    let deck = createDeck();
    deck = shuffleDeck(deck);
    const hands = dealCards(deck);

    clients.forEach(client => {
        client.ws.send(JSON.stringify({
            type: 'deal',
            hand: hands[client.id],
            dealer: clients[dealerIndex].id
        }));
    });

    setTimeout(() => {
        broadcast({
            type: 'reveal',
            hands: hands,
            dealer: clients[dealerIndex].id
        });
    }, 5000);

    setTimeout(() => {
        dealerIndex = (dealerIndex + 1) % clients.length;
        startRound();
    }, 10000);
}

function broadcast(message) {
    clients.forEach(client => {
        client.ws.send(JSON.stringify(message));
    });
}

server.on('connection', (ws) => {
    const id = crypto.randomBytes(16).toString('hex');
    const client = { id, ws };

    clients.push(client);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'join') {
            client.name = data.name;
            ws.send(JSON.stringify({ type: 'welcome', id: client.id }));
        }
    });

    ws.on('close', () => {
        clients = clients.filter(c => c.id !== client.id);
    });

    if (clients.length === 1) {
        startRound();
    }
});

console.log('Server running on ws://localhost:8080');
