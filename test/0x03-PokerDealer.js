const { expect } = require("chai");
const { ethers } = require("hardhat");

const deck = [...Array(52).keys()].map(i => i + 1); // [1 to 52]

function shuffle(shuffledDeck, blockHash, privateKey) {
  let combinedHash = ethers.keccak256(ethers.concat([
      ethers.getBytes(blockHash), 
      ethers.getBytes(privateKey)
  ]));
  for (let i = 0; i < shuffledDeck.length; i++) {
      let combined = ethers.solidityPacked(["bytes32", "uint256"], [combinedHash, i]);
      let randomIndex = BigInt(ethers.keccak256(combined), 16) % BigInt(shuffledDeck.length);
      let temp = shuffledDeck[i];
      shuffledDeck[i] = shuffledDeck[randomIndex];
      shuffledDeck[randomIndex] = temp;
  }
  return shuffledDeck;
}

describe("PokerDealer.sol", function () {
  let PokerDealer;
  let pokerDealer;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  beforeEach(async function () {
    // Deploy the PokerDealer contract
    PokerDealer = await ethers.getContractFactory("PokerDealer");
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    pokerDealer = await PokerDealer.deploy();
    await pokerDealer.waitForDeployment();
});

  describe("Hand Management", function () {
    it("Should allow a user to create a hand", async function () {
      const handPublicKey = ethers.encodeBytes32String("publicKey1");
      const addresses = [owner.address, addr1.address, addr2.address];
      const pubKeys = [handPublicKey,handPublicKey,handPublicKey];
      await expect(pokerDealer.connect(owner).createHand(1, addresses, pubKeys))
        .to.emit(pokerDealer, "HandCreated");
      const hand = await pokerDealer.hands(1);
      expect(hand.dealer).to.equal(owner.address);
    });

    it("Should play through a heads up hand", async function () {
      const handPrivateKey1 = ethers.encodeBytes32String("secret1");
      const handPublicKey1 = ethers.keccak256(handPrivateKey1);
      const handPrivateKey2 = ethers.encodeBytes32String("secret2");
      const handPublicKey2 = ethers.keccak256(handPrivateKey2);
      const addresses = [owner.address, addr2.address];
      const privKeys = [handPrivateKey1, handPrivateKey2];
      const pubKeys = [handPublicKey1,handPublicKey2];  
      await pokerDealer.connect(owner).createHand(2, addresses, pubKeys);
      let handId = await pokerDealer.handCount();
      await ethers.provider.send("evm_mine", []);
      let blockNumber = await hre.ethers.provider.getBlockNumber();
      await pokerDealer.connect(owner).flop(handId);
      await ethers.provider.send("evm_mine", []);
      blockNumber = await hre.ethers.provider.getBlockNumber();
      await pokerDealer.connect(owner).turn(handId);
      await ethers.provider.send("evm_mine", []);
      blockNumber = await hre.ethers.provider.getBlockNumber();
      await pokerDealer.connect(owner).river(handId);
      await expect(pokerDealer.connect(owner).close(handId, privKeys))
        .to.emit(pokerDealer, "HandClosed");
      const handDetails = await pokerDealer.getHand(handId);
      expect(handDetails[0]).to.be.oneOf([owner.address, addr2.address]);
    });

    it("Local hole cards match contract hole cards", async function () {
      const handPrivateKey1 = ethers.encodeBytes32String("secret1");
      const handPublicKey1 = ethers.keccak256(handPrivateKey1);
      const handPrivateKey2 = ethers.encodeBytes32String("secret2");
      const handPublicKey2 = ethers.keccak256(handPrivateKey2);
      const addresses = [owner.address, addr2.address];
      const privKeys = [handPrivateKey1, handPrivateKey2];
      const pubKeys = [handPublicKey1,handPublicKey2];  
      await pokerDealer.connect(owner).createHand(2, addresses, pubKeys);
      let handId = await pokerDealer.handCount();
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);
      const contractHoleCards = await pokerDealer.deal(handId, handPrivateKey1);
      const hash = await pokerDealer.getHash(handId);
      const shuffled = shuffle(deck, hash, handPrivateKey1);
      expect(contractHoleCards[0]).to.equal(shuffled[0]);
      expect(contractHoleCards[1]).to.equal(shuffled[1]);
    });
  });


  describe("Edge Cases", function () {
    it("Should prevent creating a hand with zero players", async function () {
      await expect(
        pokerDealer.connect(owner).createHand(2, [], [])
      ).to.be.revertedWith("Increase players");
    });
  
    it("Should prevent a player from joining the same hand multiple times", async function () {
      const handPublicKey1 = ethers.encodeBytes32String("publicKey1");
      const handPublicKey2 = ethers.encodeBytes32String("publicKey2");
      const addresses = [owner.address, owner.address];
      const pubKeys = [handPublicKey1, handPublicKey2];
      await expect(
        pokerDealer.connect(owner).createHand(2, addresses, pubKeys)
      ).to.be.revertedWith("One entry per address");
    });
  
    it("Should prevent actions on a non-existent hand", async function () {
      await expect(
        pokerDealer.connect(addr1).flop(999)
      ).to.be.reverted;
    });
  
    it("Should prevent closing a hand that doesn't exist", async function () {
      const handPrivateKey1 = ethers.encodeBytes32String("secret1");
      const handPrivateKey2 = ethers.encodeBytes32String("secret2");
      const privKeys = [handPrivateKey1, handPrivateKey2];
      await expect(
        pokerDealer.connect(addr1).close(999, privKeys)
      ).to.be.reverted;
    });
  
    it("Should handle null public keys", async function () {
      const handPrivateKey1 = ethers.encodeBytes32String("secret1");
      const handPublicKey1 = ethers.keccak256(handPrivateKey1);
      const handPublicKey2 = ethers.encodeBytes32String('')
      const addresses = [owner.address, addr2.address];
      const pubKeys = [handPublicKey1, handPublicKey2];
      await expect(
        pokerDealer.connect(owner).createHand(1, addresses, pubKeys)
      ).to.be.revertedWith("Invalid public key");
    });
  });

});
