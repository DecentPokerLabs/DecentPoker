const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'join', name: 'Player1' }));
});

ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'welcome') {
        console.log('Connected as:', data.id);
    } else if (data.type === 'deal') {
        console.log('--- New Game ---');
        console.log('Dealer:', data.dealer);
        console.log('Your hand:', data.hand);
    } else if (data.type === 'reveal') {
        console.log('All hands:', data.hands);
    }
});

ws.on('close', () => {
    console.log('Disconnected from server');
});
