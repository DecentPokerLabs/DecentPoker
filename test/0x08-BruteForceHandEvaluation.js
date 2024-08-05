const { expect } = require("chai");
const { ethers } = require("hardhat");

const originalConsoleLog = console.log;
console.log = function() {};
const PokerEvaluator = require('poker-evaluator');
console.log = originalConsoleLog;

const NUM_OF_TESTS = 10; // increase significantly to test broader range of hands, tested  on over 1 million hands on a gaming rig overnight

describe("PokerHandEvaluator", function () {
    let pokerHandEvaluator;

    before(async function () {
        const PokerHandEvaluator = await ethers.getContractFactory("PokerHandEvaluator");
        pokerHandEvaluator = await PokerHandEvaluator.deploy();
    });

    function getRandomCard() {
        return Math.floor(Math.random() * 52) + 1;
    }

    function getRandomHand() {
        let hand = new Set();
        while (hand.size < 7) {
            hand.add(getRandomCard());
        }
        return Array.from(hand);
    }

    function convertToPokerEvaluatorFormat(hand) {
        const suits = ['s', 'h', 'd', 'c'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

        return hand.map(card => {
            const value = (card - 1) % 13;
            const suit = Math.floor((card - 1) / 13);
            return ranks[value] + suits[suit];
        });
    }

    function evaluateHand(hand) {
        return PokerEvaluator.evalHand(hand);
    }

    it("should compare hands correctly", async function () {
        for (let i = 0; i < NUM_OF_TESTS; i++) {
            const hand1 = getRandomHand();
            const hand2 = getRandomHand();
            const formattedHand1 = convertToPokerEvaluatorFormat(hand1);
            const formattedHand2 = convertToPokerEvaluatorFormat(hand2);
            //console.log(hand1, formattedHand1);
            //console.log(hand2, formattedHand2);
            const result1 = evaluateHand(formattedHand1);
            const result2 = evaluateHand(formattedHand2);
            const expected = result1.value > result2.value ? 1 : result1.value < result2.value ? 2 : 0;
            const contractResult = await pokerHandEvaluator.compareHands(hand1, hand2);
            try {
                expect(contractResult).to.equal(expected);
            } catch (error) {
                console.log("Test failed for the following hands:");
                console.log("Hand 1:", hand1, "Formatted Hand 1:", formattedHand1, "Evaluation:", result1);
                console.log("Hand 2:", hand2, "Formatted Hand 2:", formattedHand2, "Evaluation:", result2);
                console.log("Expected:", expected, "Contract Result:", contractResult);
                throw error; // Rethrow the error to ensure the test fails
            }
        }
    });
});