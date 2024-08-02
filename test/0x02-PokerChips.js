const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokerChips.sol", function () {
  let PokerChips;
  let pokerChips;
  let MockUSDC;
  let usdc;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock USDC token
    MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy("USD Coin", "USDC");
    await usdc.waitForDeployment();

    // Mint some USDC tokens to owner
    await usdc.mint(owner.address, ethers.parseUnits("1000", 6));

    // Deploy PokerChips contract
    PokerChips = await ethers.getContractFactory("PokerChips");
    pokerChips = await PokerChips.deploy(usdc.target);
    await pokerChips.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right USDC token address", async function () {
      expect(await pokerChips.usdcToken()).to.equal(usdc.target);
    });

    it("Should have the correct name and symbol", async function () {
      expect(await pokerChips.name()).to.equal("PokerChips");
      expect(await pokerChips.symbol()).to.equal("PKR");
    });
  });

  describe("Deposit USDC", function () {
    it("Should deposit USDC and mint PokerChips", async function () {
      const amount = ethers.parseUnits("100", 6);

      // Approve PokerChips contract to spend owner's USDC
      await usdc.approve(pokerChips.target, amount);

      // Deposit USDC
      await pokerChips.depositUSDC(amount);

      // Check PokerChips balance
      expect(await pokerChips.balanceOf(owner.address)).to.equal(amount);

      // Check USDC balance
      expect(await usdc.balanceOf(owner.address)).to.equal(ethers.parseUnits("900", 6));
      expect(await usdc.balanceOf(pokerChips.target)).to.equal(amount);
    });

    it("Should fail if USDC transfer fails", async function () {
      const amount = ethers.parseUnits("100", 6);
      await expect(pokerChips.connect(addr1).depositUSDC(amount)).to.be.reverted;
    });
  });

  describe("Withdraw", function () {
    it("Should withdraw PokerChips and transfer USDC", async function () {
      const amount = ethers.parseUnits("100", 6);

      // Approve PokerChips contract to spend owner's USDC
      await usdc.approve(pokerChips.target, amount);

      // Deposit USDC
      await pokerChips.depositUSDC(amount);

      // Withdraw PokerChips
      await pokerChips.withdraw(amount);

      // Check PokerChips balance
      expect(await pokerChips.balanceOf(owner.address)).to.equal(0);

      // Check USDC balance
      expect(await usdc.balanceOf(owner.address)).to.equal(ethers.parseUnits("1000", 6));
      expect(await usdc.balanceOf(pokerChips.target)).to.equal(0);
    });

    it("Should fail if insufficient PokerChip balance", async function () {
      const amount = ethers.parseUnits("100", 6);

      await expect(pokerChips.withdraw(amount)).to.be.revertedWith("Insufficient PokerChips balance");
    });

    it("Should fail if USDC transfer fails", async function () {
      const amount = ethers.parseUnits("100", 6);
      // Approve PokerChips contract to spend owner's USDC
      await usdc.approve(pokerChips.target, amount);

      // Deposit USDC
      await pokerChips.depositUSDC(amount);

      // Transfer USDC from contract to addr1, making the contract balance insufficient
      const bal = pokerChips.balanceOf(owner);
      await pokerChips.transfer(addr1.address, bal);

      await expect(pokerChips.withdraw(amount)).to.be.reverted;
    });
  });
});
