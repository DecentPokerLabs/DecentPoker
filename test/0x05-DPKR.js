const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DecentPoker", function () {
    let DecentPoker, decentPoker, owner, addr1, addr2, usdcToken;
    const USDC_INITIAL_SUPPLY = ethers.parseUnits("1000000", 6); // 1 million USDC
    const DPKR_DECIMALS = 18;

    beforeEach(async function () {
      [owner, addr1, addr2] = await ethers.getSigners();

      // Deploy mock USDC token
      const MockUSDC = await ethers.getContractFactory("MockUSDC");
      usdcToken = await MockUSDC.deploy("MockUSDC", "MUSDC");

      // Deploy DecentPoker contract
      DecentPoker = await ethers.getContractFactory("DecentPoker");
      decentPoker = await DecentPoker.deploy(await usdcToken.getAddress());

      // Mint some USDC to addr1 and addr2 for testing
      await usdcToken.mint(addr1.address, ethers.parseUnits("10000", 6));
      await usdcToken.mint(addr2.address, ethers.parseUnits("10000", 6));
    });

    describe("Deployment", function () {
      it("Should set the right owner", async function () {
          expect(await decentPoker.team()).to.equal(owner.address);
      });

      it("Should mint initial supply to owner", async function () {
          const ownerBalance = await decentPoker.balanceOf(owner.address);
          expect(ownerBalance).to.equal(ethers.parseUnits("25000000", DPKR_DECIMALS));
      });
    });

    describe("Token Sale", function () {
      it("Should not allow buying tokens before start date", async function () {
          await expect(decentPoker.connect(addr1).buyTokens(ethers.parseUnits("1000", 6)))
            .to.be.revertedWith("too soon");
      });

      it("Should allow buying tokens after start date", async function () {
          await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
          await ethers.provider.send("evm_mine");

          const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
          await usdcToken.connect(addr1).approve(decentPoker.getAddress(), usdcAmount);

          await expect(decentPoker.connect(addr1).buyTokens(usdcAmount))
            .to.emit(decentPoker, "TokenSale")
            .withArgs(addr1.address, ethers.parseUnits("25000", DPKR_DECIMALS), usdcAmount);
      });
    });

    describe("Minting", function () {
      it("Should allow team to mint community tokens", async function () {
          const mintAmount = ethers.parseUnits("1000000", DPKR_DECIMALS);
          await decentPoker.connect(owner).mintCommunity(addr1.address, mintAmount);
          expect(await decentPoker.balanceOf(addr1.address)).to.equal(mintAmount);
      });

      it("Should not allow non-team to mint community tokens", async function () {
          const mintAmount = ethers.parseUnits("1000000", DPKR_DECIMALS);
          await expect(decentPoker.connect(addr1).mintCommunity(addr2.address, mintAmount))
            .to.be.revertedWith("Only team multisig can mint");
      });
    });

    describe("Token Locking", function () {
      it("Should not allow unlocking team tokens before time", async function () {
          await expect(decentPoker.connect(owner).unlockTeamTokens())
            .to.be.revertedWith("too early");
      });

      it("Should allow unlocking team tokens after time", async function () {
          await decentPoker.connect(owner).goLive()
          await ethers.provider.send("evm_increaseTime", [1096 * 24 * 60 * 60]); // 1096 days
          await ethers.provider.send("evm_mine");
          await decentPoker.connect(owner).unlockTeamTokens();
          const ownerBalance = await decentPoker.balanceOf(owner.address);
          expect(ownerBalance).to.equal(ethers.parseUnits("40000000", DPKR_DECIMALS));
      });
    });

    describe("Price Calculation", function () {
      it("Should calculate correct price per day", async function () {
          const day0Price = await decentPoker.pricePerDay(0);
          expect(day0Price).to.equal(40000);

          const day30Price = await decentPoker.pricePerDay(30);
          expect(day30Price).to.equal(60000);
      });

      it("Should return correct next price update", async function () {
          await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
          await ethers.provider.send("evm_mine");

          const [secondsLeft, nextPrice] = await decentPoker.nextPriceUpdate();
          expect(secondsLeft).to.be.lte(86400); // Less than or equal to 1 day
          expect(nextPrice).to.be.gt(40000);
      });
    });
});