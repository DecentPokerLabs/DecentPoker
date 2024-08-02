const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokerHandEvaluator.sol", function () {
  let PokerHandEvaluator;
  let pokerHandEvaluator;

  before(async function () {
    PokerHandEvaluator = await ethers.getContractFactory("PokerHandEvaluator");
    pokerHandEvaluator = await PokerHandEvaluator.deploy();
  });

  const getValue = (card) => ((card - 1) % 13) + 2;
  const getSuit = (card) => Math.floor((card - 1) / 13); // ['s', 'h', 'd', 'c'];

  function createCard(value, suit) {
    const card = (suit * 13) + value - 1; // Cards are in the range 1-52
    if (getValue(card) !== value) throw new Error("Card value wrong");
    if (getSuit(card) !== suit) throw new Error("Card suit wrong");
    return card;
  }
  
  describe("evaluateBestHand", function () {
    it("should correctly identify a Royal Flush", async function () {
      const hand = [
        createCard(14, 0), // Ace of Hearts
        createCard(13, 0), // King of Hearts
        createCard(12, 0), // Queen of Hearts
        createCard(11, 0), // Jack of Hearts
        createCard(10, 0), // 10 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(9); // Royal Flush
    });

    it("should correctly identify a Straight Flush", async function () {
      const hand = [
        createCard(9, 0),  // 9 of Hearts
        createCard(8, 0),  // 8 of Hearts
        createCard(7, 0),  // 7 of Hearts
        createCard(6, 0),  // 6 of Hearts
        createCard(5, 0),  // 5 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(8); // Straight Flush
    });

    it("should correctly identify Four of a Kind", async function () {
      const hand = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(10, 2), // 10 of Clubs
        createCard(10, 3), // 10 of Spades
        createCard(7, 0),  // 7 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(7); // Four of a Kind
    });

    it("should correctly identify a Full House", async function () {
      const hand = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(10, 2), // 10 of Clubs
        createCard(7, 0),  // 7 of Hearts
        createCard(7, 1),  // 7 of Diamonds
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(6); // Full House
    });

    it("should correctly identify a Flush", async function () {
      const hand = [
        createCard(14, 0), // Ace of Hearts
        createCard(10, 0), // 10 of Hearts
        createCard(8, 0),  // 8 of Hearts
        createCard(6, 0),  // 6 of Hearts
        createCard(4, 0),  // 4 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(5); // Flush
    });

    it("should correctly identify a Straight", async function () {
      const hand = [
        createCard(10, 0), // 10 of Hearts
        createCard(9, 1),  // 9 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(4); // Straight
    });

    it("should correctly identify Three of a Kind", async function () {
      const hand = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(10, 2), // 10 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(3); // Three of a Kind
    });

    it("should correctly identify Two Pair", async function () {
      const hand = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(7, 2),  // 7 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(2); // Two Pair
    });

    it("should correctly identify One Pair", async function () {
      const hand = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(1); // One Pair
    });

    it("should correctly identify High Card", async function () {
      const hand = [
        createCard(14, 0), // Ace of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(5, 0),  // 5 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(0); // High Card
    });

    it("should correctly identify an Ace-low Straight", async function () {
      const hand = [
        createCard(14, 0), // Ace of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2),  // 3 of Clubs
        createCard(4, 3),  // 4 of Spades
        createCard(5, 0),  // 5 of Hearts
        createCard(7, 1),  // 7 of Diamonds
        createCard(9, 2)   // 9 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(4); // Straight
    });

    it("should correctly identify the highest card among High Cards", async function () {
      const hand1 = [
        createCard(14, 0), // Ace of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(5, 0),  // 5 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(13, 0), // King of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(5, 0),  // 5 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(1); // Hand 1 (Ace High) should win
    });

    it("should correctly identify a Full House over a Three of a Kind", async function () {
      const hand1 = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(10, 2), // 10 of Clubs
        createCard(7, 0),  // 7 of Hearts
        createCard(7, 1),  // 7 of Diamonds
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(10, 2), // 10 of Clubs
        createCard(8, 3),  // 8 of Spades
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(1); // Hand 1 (Full House) should win
    });

    it("should correctly identify a Straight over Three of a Kind", async function () {
      const hand1 = [
        createCard(10, 0), // 10 of Hearts
        createCard(9, 1),  // 9 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(10, 2), // 10 of Clubs
        createCard(8, 3),  // 8 of Spades
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(1); // Hand 1 (Straight) should win
    });

    it("should correctly identify a Two Pair over One Pair", async function () {
      const hand1 = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(7, 2),  // 7 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(1); // Hand 1 (Two Pair) should win
    });
  });

  describe("compareHands", function () {
    it("should correctly compare two different hands", async function () {
      const hand1 = [
        createCard(14, 0), // Ace of Hearts
        createCard(13, 0), // King of Hearts
        createCard(12, 0), // Queen of Hearts
        createCard(11, 0), // Jack of Hearts
        createCard(10, 0), // 10 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(10, 1), // 10 of Diamonds
        createCard(10, 2), // 10 of Clubs
        createCard(10, 3), // 10 of Spades
        createCard(9, 0),  // 9 of Hearts
        createCard(9, 1),  // 9 of Diamonds
        createCard(2, 2),  // 2 of Clubs
        createCard(3, 3)   // 3 of Spades
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(1); // Hand 1 (Royal Flush) should win
    });

    it("should correctly identify a tie", async function () {
      const hand1 = [
        createCard(14, 0), // Ace of Hearts
        createCard(13, 0), // King of Hearts
        createCard(12, 0), // Queen of Hearts
        createCard(11, 0), // Jack of Hearts
        createCard(10, 0), // 10 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(14, 1), // Ace of Diamonds
        createCard(13, 1), // King of Diamonds
        createCard(12, 1), // Queen of Diamonds
        createCard(11, 1), // Jack of Diamonds
        createCard(10, 1), // 10 of Diamonds
        createCard(2, 2),  // 2 of Clubs
        createCard(3, 3)   // 3 of Spades
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(0); // Both hands are Royal Flush, should be a tie
    });

    it("should correctly compare High Card hands", async function () {
      const hand1 = [
        createCard(14, 0), // Ace of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(5, 0),  // 5 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(13, 0), // King of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(5, 0),  // 5 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(1); // Hand 1 (Ace High) should win
    });

    it("should correctly identify a tie among High Cards", async function () {
      const hand1 = [
        createCard(14, 0), // Ace of Hearts
        createCard(13, 1), // King of Diamonds
        createCard(12, 2), // Queen of Clubs
        createCard(11, 3), // Jack of Spades
        createCard(9, 0),  // 9 of Hearts
        createCard(8, 1),  // 8 of Diamonds
        createCard(7, 2)   // 7 of Clubs
      ];

      const hand2 = [
        createCard(14, 1), // Ace of Diamonds
        createCard(13, 2), // King of Clubs
        createCard(12, 3), // Queen of Spades
        createCard(11, 0), // Jack of Hearts
        createCard(9, 1),  // 9 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(7, 3)   // 7 of Spades
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(0); // Both hands are High Card with same values, should be a tie
    });
  });

  describe("edgeCases", function () {
    it("should correctly identify a Four of a Kind over Full House", async function () {
      const hand1 = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(10, 2), // 10 of Clubs
        createCard(10, 3), // 10 of Spades
        createCard(2, 0),  // 2 of Hearts
        createCard(7, 1),  // 7 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(9, 0),  // 9 of Hearts
        createCard(9, 1),  // 9 of Diamonds
        createCard(9, 2),  // 9 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(7, 0),  // 7 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(1); // Hand 1 (Four of a Kind) should win
    });

    it("should correctly identify a Straight with highest card Ace", async function () {
      const hand = [
        createCard(14, 0), // Ace of Hearts
        createCard(13, 1), // King of Diamonds
        createCard(12, 2), // Queen of Clubs
        createCard(11, 3), // Jack of Spades
        createCard(10, 0), // 10 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(4); // Straight
    });

    it("should correctly identify the kicker in One Pair", async function () {
      const hand = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(14, 2), // Ace of Clubs
        createCard(13, 3), // King of Spades
        createCard(12, 0), // Queen of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(1); // One Pair
      expect(evaluation[1][2]).to.equal(14); // Ace is the kicker i.e. 10,10,A,K,Q
    });

    it("should correctly identify a Flush with highest card King", async function () {
      const hand = [
        createCard(14, 0), // Ace of Hearts
        createCard(13, 0), // King of Hearts
        createCard(10, 0), // 10 of Hearts
        createCard(8, 0),  // 8 of Hearts
        createCard(6, 0),  // 6 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(5); // Flush
      expect(evaluation[1][0]).to.equal(14); // Ace is the highest card
    });

    it("should correctly identify a tie with exact same Two Pair", async function () {
      const hand1 = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(7, 2),  // 7 of Clubs
        createCard(7, 3),  // 7 of Spades
        createCard(5, 0),  // 5 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(10, 2), // 10 of Clubs
        createCard(10, 3), // 10 of Spades
        createCard(7, 0),  // 7 of Hearts
        createCard(7, 1),  // 7 of Diamonds
        createCard(5, 1),  // 5 of Diamonds
        createCard(2, 3),  // 2 of Spades
        createCard(3, 0)   // 3 of Hearts
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(0); // Both hands are identical, should be a tie
    });

    it("should correctly identify a higher Straight Flush over a lower one", async function () {
      const hand1 = [
        createCard(9, 0),  // 9 of Hearts
        createCard(8, 0),  // 8 of Hearts
        createCard(7, 0),  // 7 of Hearts
        createCard(6, 0),  // 6 of Hearts
        createCard(5, 0),  // 5 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(8, 1),  // 8 of Diamonds
        createCard(7, 1),  // 7 of Diamonds
        createCard(6, 1),  // 6 of Diamonds
        createCard(5, 1),  // 5 of Diamonds
        createCard(4, 1),  // 4 of Diamonds
        createCard(2, 2),  // 2 of Clubs
        createCard(3, 3)   // 3 of Spades
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(1); // Hand 1 (9-high Straight Flush) should win
    });

    it("should correctly identify an invalid hand", async function () {
      const hand = [
        createCard(14, 0), // Ace of Hearts
        createCard(14, 1), // Ace of Diamonds
        createCard(14, 2), // Ace of Clubs
        createCard(14, 3), // Ace of Spades
        createCard(14, 0), // Another Ace of Hearts (invalid)
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      try {
        await pokerHandEvaluator.evaluateBestHand(hand);
      } catch (error) {
        expect(error.message).to.include("Invalid hand");
      }
    });

    it("should correctly identify a straight with an Ace as the lowest card", async function () {
      const hand = [
        createCard(14, 0), // Ace of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2),  // 3 of Clubs
        createCard(4, 3),  // 4 of Spades
        createCard(5, 0),  // 5 of Hearts
        createCard(9, 1),  // 9 of Diamonds
        createCard(10, 2)  // 10 of Clubs
      ];

      const evaluation = await pokerHandEvaluator.evaluateBestHand(hand);
      expect(evaluation[0]).to.equal(4); // Straight
    });

    it("should correctly handle a tie breaker for Two Pair", async function () {
      const hand1 = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(8, 3),  // 8 of Spades
        createCard(5, 0),  // 5 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(10, 2), // 10 of Clubs
        createCard(10, 3), // 10 of Spades
        createCard(8, 0),  // 8 of Hearts
        createCard(8, 1),  // 8 of Diamonds
        createCard(6, 1),  // 6 of Diamonds
        createCard(2, 2),  // 2 of Clubs
        createCard(3, 3)   // 3 of Spades
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);    
      expect(result).to.equal(2); // Hand 2 (6 kicker) should win
    });

    it("should correctly identify the higher kicker in One Pair", async function () {
      const hand1 = [
        createCard(10, 0), // 10 of Hearts
        createCard(10, 1), // 10 of Diamonds
        createCard(14, 2), // Ace of Clubs
        createCard(9, 3),  // 9 of Spades
        createCard(8, 0),  // 8 of Hearts
        createCard(2, 1),  // 2 of Diamonds
        createCard(3, 2)   // 3 of Clubs
      ];

      const hand2 = [
        createCard(10, 2), // 10 of Clubs
        createCard(10, 3), // 10 of Spades
        createCard(13, 0), // King of Hearts
        createCard(9, 1),  // 9 of Diamonds
        createCard(8, 2),  // 8 of Clubs
        createCard(2, 2),  // 2 of Clubs
        createCard(3, 3)   // 3 of Spades
      ];

      const result = await pokerHandEvaluator.compareHands(hand1, hand2);
      expect(result).to.equal(1); // Hand 1 (Ace kicker) should win
    });
  });

});
