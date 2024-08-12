const { ethers } = require('ethers');

const blockHash = '0x029856239cbdf636ae5828778da7d2437494040db66ef56ac95d0460d481da56';
const privateKey = '0xae3038c5b582cb0ee606eac6f4bc32ca2ce66f9a2b671a9bca6aad6bcaf8d192';

function shuffleDeckOLD(hash) {
    let deck = [...Array(52).keys()].map(i => i + 1); // Initialize a deck array with values 1 to 52
    let shuffledDeck = [...deck];
    for (let i = 0; i < shuffledDeck.length; i++) {
        let iBytes = ethers.zeroPadValue(ethers.toUtf8Bytes(i.toString()), 32); // Convert integer to bytes      
        let combined = ethers.concat([hash, iBytes]);
        let randomIndex = parseInt(ethers.keccak256(combined), 16) % shuffledDeck.length;
        let temp = shuffledDeck[i];
        shuffledDeck[i] = shuffledDeck[randomIndex];
        shuffledDeck[randomIndex] = temp;
    }
    return shuffledDeck;
  }

  function shuffleDeck(hash) {
    let deck = [...Array(52).keys()].map(i => i + 1); // Initialize a deck array with values 1 to 52
    let shuffledDeck = [...deck];
    for (let i = 0; i < shuffledDeck.length; i++) {
        let combined = ethers.solidityPacked(["bytes32", "uint256"], [hash, i]); // Use solidityPack for ABI encoding
        let randomIndex = BigInt(ethers.keccak256(combined), 16) % BigInt(shuffledDeck.length);
        let temp = shuffledDeck[i];
        shuffledDeck[i] = shuffledDeck[randomIndex];
        shuffledDeck[randomIndex] = temp;
    }
    return shuffledDeck;
}

  
  function shuffleAndDeal(blockHash, privateKey) {
    let combinedHash = ethers.keccak256(ethers.concat([
        ethers.getBytes(blockHash), 
        ethers.getBytes(privateKey)
    ]));
    let shuffledDeck = shuffleDeck(combinedHash);
    return shuffledDeck.slice(0, 7);
  }

  const res = shuffleAndDeal(blockHash, privateKey)
  console.log(res)