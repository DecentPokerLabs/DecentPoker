const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokerChips.sol", function () {
  let PokerChips;
  let pokerChips;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PokerChips contract
    PokerChips = await ethers.getContractFactory("PokerChips");
    pokerChips = await PokerChips.deploy();
    await pokerChips.waitForDeployment();
  });

  describe("Deployment", function () {

    it("Should have the correct name and symbol", async function () {
      expect(await pokerChips.name()).to.equal("PokerChips");
      expect(await pokerChips.symbol()).to.equal("PKR");
    });
  });

  describe("Mint", function () {
    it("Should mint PokerChips", async function () {
      const amount = ethers.parseUnits("100", 6);
      await pokerChips.mint(amount);
      expect(await pokerChips.balanceOf(owner.address)).to.equal(amount);
    });

    it("Should fail to mint more than one million", async function () {
      const amount = ethers.parseUnits("1000001", 6);
      expect(pokerChips.mint(amount))
        .to.be.revertedWith("Cant mint more than one mil");
    });
  });
});
