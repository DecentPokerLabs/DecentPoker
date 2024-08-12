const crypto = require('crypto');

const blockHash = '0x029856239cbdf636ae5828778da7d2437494040db66ef56ac95d0460d481da56';
const privateKey = '0xae3038c5b582cb0ee606eac6f4bc32ca2ce66f9a2b671a9bca6aad6bcaf8d192';


const createDeck = () => {
    const suits = [0, 1, 2, 3];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const deck = [];
    
    for (let suit = 0; suit < suits.length; suit++) {
        for (let value of values) {
            deck.push([value, suit]);
        }
    }
    return deck;
}

const shuffleDeck = (deck, hash) => {
    const hashBuffer = Buffer.from(hash, 'hex');
    let shuffledDeck = deck.slice();

    for (let i = 0; i < shuffledDeck.length; i++) {
        const hashIndex = i % hashBuffer.length;
        const randomIndex = hashBuffer[hashIndex] % shuffledDeck.length;
        [shuffledDeck[i], shuffledDeck[randomIndex]] = [shuffledDeck[randomIndex], shuffledDeck[i]];
    }

    return shuffledDeck;
}

const init = () => {
    const deck = createDeck();
    console.log('Original Deck:', deck);
    const hash = blockHash.replace('0x','') + privateKey.replace('0x','')
    const shuffledDeck = shuffleDeck(deck, hash);
    console.log('Shuffled Deck:', shuffledDeck);
};

init();