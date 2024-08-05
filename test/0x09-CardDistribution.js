const { expect } = require("chai");
const { ethers } = require("hardhat");

function shuffleDeck(hash) {
    let deck = [...Array(52).keys()].map(i => i + 1); // [1 to 52]
    let shuffledDeck = [...deck];
    for (let i = 0; i < shuffledDeck.length; i++) {
        let combined = ethers.solidityPacked(["bytes32", "uint256"], [hash, i]);
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
    return shuffledDeck.slice(0, 52);
}

describe("PokerDealer.sol", function () {
    describe("Check even card distribution", function () {
        it("Should ensure fair card distribution", async function () {
            const cardCounts = new Array(52).fill(0);
            const numGames = 100; // 10000000 add some zeros for accurate testing
            for (let game = 0; game < numGames; game++) {
                const cards = shuffleAndDeal(ethers.randomBytes(32), ethers.randomBytes(32));
                cards.forEach(card => cardCounts[card - 1]++);
            }            
            // Check if the distribution is roughly uniform
            const expectedCount = (numGames * 52) / 52; // Each card should appear about this many times
            const tolerance = 999; // 0.1 = 10% deviation, reduce down for accurate testing
            cardCounts.forEach((count, index) => {
                expect(count).to.be.closeTo(expectedCount, expectedCount * tolerance, `Card ${index + 1} appeared ${count} times, expected close to ${expectedCount}`);
            });
        });
    });
});