const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokerLobby", function () {
  let pokerLobby;
  let pokerGame;
  let pokerChips;
  let owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10;
  let players;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10] = await ethers.getSigners();
    players = [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10];

    const HandEvaluator = await ethers.getContractFactory("PokerHandEvaluator");
    handEvaluator = await HandEvaluator.deploy();

    const PokerChips = await ethers.getContractFactory("PokerChips");
    pokerChips = await PokerChips.deploy();

    const PokerDealer = await ethers.getContractFactory("PokerDealer");
    pokerDealer = await PokerDealer.deploy();

    const PokerLobby = await ethers.getContractFactory("PokerLobby");
    pokerLobby = await PokerLobby.deploy();

    const PokerGame = await ethers.getContractFactory("PokerGame");
    pokerGame = await PokerGame.deploy(
        await handEvaluator.getAddress(),
        await pokerDealer.getAddress(),
        await pokerLobby.getAddress(),
    );

    await pokerLobby.setPokerGameAddress(await pokerGame.getAddress());

    for (const addr of [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10]) {
    const mil = ethers.parseUnits("999999", 6);
        await pokerChips.connect(addr).mint(mil);
    }
  });

  describe("Cash Games", function () {
    it("should create a cash game", async function () {
      const maxPlayers = 6;
      const bigBlind = ethers.parseUnits("2", 6); // 2 USDC
      const invitePublicKey = ethers.randomBytes(32);

      await expect(pokerLobby.createCashGame(maxPlayers, bigBlind, invitePublicKey, await pokerChips.getAddress()))
        .to.emit(pokerLobby, "CashGameCreated")
        .withArgs(1, maxPlayers, bigBlind, await pokerChips.getAddress());

      const game = await pokerLobby.cashGames(1);
      expect(game.gid).to.equal(1);
      expect(game.maxPlayers).to.equal(maxPlayers);
      expect(game.bigBlind).to.equal(bigBlind);
      expect(game.token).to.equal(await pokerChips.getAddress());
    });

    it("should allow a player to join a cash game", async function () {
      // Create a cash game
      const maxPlayers = 6;
      const bigBlind = ethers.parseUnits("2", 6);
      const invitePrivateKey = ethers.encodeBytes32String("secret1a");
      const invitePublicKey = ethers.keccak256(invitePrivateKey);
      const handPrivateKey = ethers.encodeBytes32String("secret1b");
      const handPublicKey = ethers.keccak256(handPrivateKey);
      await pokerLobby.createCashGame(maxPlayers, bigBlind, invitePublicKey, await pokerChips.getAddress());

      // Approve token transfer
      const buyIn = bigBlind * 100n;
      await pokerChips.connect(addr1).approve(await pokerLobby.getAddress(), buyIn);

      // Join the game
      const seat = 0;

      await expect(pokerLobby.connect(addr1).joinCashGame(1, seat, handPublicKey, invitePrivateKey))
        .to.emit(pokerLobby, "JoinCashGame")
        .withArgs(1, await addr1.getAddress(), seat);
    });
  });

  describe("Sit and Go Tournaments", function () {
    it("should create a sit and go tournament", async function () {
      const maxPlayers = 9;
      const bigBlind = ethers.parseUnits("20", 6);
      const blindDuration = 900; // 15 minutes
      const startingChips = ethers.parseUnits("10000", 6);
      const invitePrivateKey = ethers.encodeBytes32String("secret1a");
      const invitePublicKey = ethers.keccak256(invitePrivateKey);
      const buyIn = ethers.parseUnits("100", 6);

      await expect(pokerLobby.createSitAndGo(maxPlayers, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress()))
        .to.emit(pokerLobby, "SitAndGoCreated")
        .withArgs(1, maxPlayers, bigBlind, buyIn, await pokerChips.getAddress());

      const game = await pokerLobby.sitAndGos(1);
      expect(game.gid).to.equal(1);
      expect(game.maxPlayers).to.equal(maxPlayers);
      expect(game.bigBlind).to.equal(bigBlind);
      expect(game.blindDuration).to.equal(blindDuration);
      expect(game.startingChips).to.equal(startingChips);
      expect(game.buyIn).to.equal(buyIn);
      expect(game.token).to.equal(await pokerChips.getAddress());
    });

    it("should allow a player to register for a sit and go tournament", async function () {
      // Create a sit and go tournament
      const maxPlayers = 9;
      const bigBlind = ethers.parseUnits("20", 6);
      const blindDuration = 900;
      const startingChips = ethers.parseUnits("10000", 6);
      const invitePrivateKey = ethers.encodeBytes32String("secret1a");
      const invitePublicKey = ethers.keccak256(invitePrivateKey);
      const buyIn = ethers.parseUnits("100", 6);
      await pokerLobby.createSitAndGo(maxPlayers, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress());

      // Approve token transfer
      await pokerChips.connect(addr1).approve(await pokerLobby.getAddress(), buyIn);

      // Register for the tournament
      const seat = 0;
      const handPrivateKey = ethers.encodeBytes32String("secret1b");
      const handPublicKey = ethers.keccak256(handPrivateKey);
      await expect(pokerLobby.connect(addr1).registerSitAndGo(1, seat, handPublicKey, invitePrivateKey))
        .to.emit(pokerLobby, "RegisterSitAndGo")
        .withArgs(1, await addr1.getAddress(), seat);
    });

    it("should start a sit and go tournament when all seats are filled", async function () {
      const maxPlayers = 6;
      const bigBlind = ethers.parseUnits("20", 6);
      const blindDuration = 900;
      const startingChips = ethers.parseUnits("10000", 6);
      const invitePrivateKey = ethers.encodeBytes32String("secret1a");
      const invitePublicKey = ethers.keccak256(invitePrivateKey);

      const buyIn = ethers.parseUnits("100", 6);
      
      await pokerLobby.createSitAndGo(maxPlayers, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress());

      // Register all players
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        await pokerChips.connect(player).mint(buyIn);
        await pokerChips.connect(player).approve(await pokerLobby.getAddress(), buyIn);
        const handPrivateKey = ethers.encodeBytes32String("secret1b");
        const handPublicKey = ethers.keccak256(handPrivateKey);
        if (i === maxPlayers - 1) {
          await expect(pokerLobby.connect(player).registerSitAndGo(1, i, handPublicKey, invitePrivateKey))
            .to.emit(pokerLobby, "SitAndGoStarted");
        } else {
          await pokerLobby.connect(player).registerSitAndGo(1, i, handPublicKey, invitePrivateKey);
        }
      }

      const game = await pokerLobby.sitAndGos(1);
      expect(game.startTimestamp).to.not.equal(0);
    });

    it("should not allow registration after the tournament has started", async function () {
    const maxPlayers = 6;
    const bigBlind = ethers.parseUnits("20", 6);
    const blindDuration = 900;
    const startingChips = ethers.parseUnits("10000", 6);
    const invitePrivateKey = ethers.encodeBytes32String("secret1a");
    const invitePublicKey = ethers.keccak256(invitePrivateKey);
  
    const buyIn = ethers.parseUnits("100", 6);
    
    await pokerLobby.createSitAndGo(maxPlayers, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress());
  
    // Register all players
    for (let i = 0; i < maxPlayers; i++) {
      const player = players[i];
      await pokerChips.connect(player).mint(buyIn);
      await pokerChips.connect(player).approve(await pokerLobby.getAddress(), buyIn);
      const handPrivateKey = ethers.encodeBytes32String("secret1b");
      const handPublicKey = ethers.keccak256(handPrivateKey);
      if (i === maxPlayers - 1) {
      await expect(pokerLobby.connect(player).registerSitAndGo(1, i, handPublicKey, invitePrivateKey))
        .to.emit(pokerLobby, "SitAndGoStarted");
      } else {
      await pokerLobby.connect(player).registerSitAndGo(1, i, handPublicKey, invitePrivateKey);
      }
    }
  
    const game = await pokerLobby.sitAndGos(1);
    expect(game.startTimestamp).to.not.equal(0);
    await pokerChips.connect(addr2).mint(buyIn);
    await pokerChips.connect(addr2).approve(await pokerLobby.getAddress(), buyIn);
    const handPublicKey = ethers.randomBytes(32);

    await expect(pokerLobby.connect(addr2).registerSitAndGo(1, 0, handPublicKey, invitePublicKey))
      .to.be.revertedWith("Seat taken forrest");
    });
  });

  describe("End Game for Sit and Go Tournaments", function () {
    let gameId;
    
    const bigBlind = ethers.parseUnits("20", 6);
    const blindDuration = 900;
    const startingChips = ethers.parseUnits("10000", 6);
    const invitePrivateKey = ethers.encodeBytes32String("secret1a");
    const invitePublicKey = ethers.keccak256(invitePrivateKey);
    const buyIn = ethers.parseUnits("100", 6);

    beforeEach(async function () {
      
    });

    it("should correctly distribute prizes for a 9-player tournament", async function () {
      const maxPlayers = 9;
      const tx = await pokerLobby.createSitAndGo(9, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress());
      const receipt = await tx.wait();
      gameId = receipt.logs[1].args[0];
      // Register all players
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        await pokerChips.connect(player).mint(buyIn);
        await pokerChips.connect(player).approve(await pokerLobby.getAddress(), buyIn);
        const handPublicKey = ethers.randomBytes(32);
        await pokerLobby.connect(player).registerSitAndGo(gameId, i, handPublicKey, invitePrivateKey);
      }

      const prizePool = buyIn * BigInt(maxPlayers);
      const firstPlace = prizePool / 2n;
      const secondPlace = (prizePool * 3n) / 10n;
      const thirdPlace = prizePool - firstPlace - secondPlace;
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        player.initialBalance = await pokerChips.balanceOf(player);
        await pokerGame.connect(player).leaveGame(gameId);
      }
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        player.finalBalance = await pokerChips.balanceOf(player);
        const winnings = player.finalBalance - player.initialBalance;
        if (i === maxPlayers - 1) {
          expect(winnings).to.equal(firstPlace);
        } else if (i === maxPlayers - 2) {
          expect(winnings).to.equal(secondPlace);
        } else if (i === maxPlayers - 3) {
          expect(winnings).to.equal(thirdPlace);
        } else {
          expect(winnings).to.equal(0);
        }
      }
    });

    it("should correctly distribute prizes for a 6-player tournament", async function () {
      const maxPlayers = 6;
      const tx = await pokerLobby.createSitAndGo(maxPlayers, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress());
      const receipt = await tx.wait();
      gameId = receipt.logs[1].args[0];
      // Register all players
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        await pokerChips.connect(player).mint(buyIn);
        await pokerChips.connect(player).approve(await pokerLobby.getAddress(), buyIn);
        const handPublicKey = ethers.randomBytes(32);
        await pokerLobby.connect(player).registerSitAndGo(gameId, i, handPublicKey, invitePrivateKey);
      }
      const prizePool = buyIn * BigInt(maxPlayers);
      const firstPlace = (prizePool * 65n) / 100n;
      const secondPlace = prizePool - firstPlace;
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        player.initialBalance = await pokerChips.balanceOf(player);
        await pokerGame.connect(player).leaveGame(gameId);
      }
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        player.finalBalance = await pokerChips.balanceOf(player);
        const winnings = player.finalBalance - player.initialBalance;
        if (i === maxPlayers - 1) {
          expect(winnings).to.equal(firstPlace);
        } else if (i === maxPlayers - 2) {
          expect(winnings).to.equal(secondPlace);
        } else {
          expect(winnings).to.equal(0);
        }
      }
    });

    it("should correctly distribute prize for a 2-player tournament", async function () {
      const maxPlayers = 2;
      const tx = await pokerLobby.createSitAndGo(maxPlayers, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress());
      const receipt = await tx.wait();
      gameId = receipt.logs[1].args[0];
      // Register all players
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        await pokerChips.connect(player).mint(buyIn);
        await pokerChips.connect(player).approve(await pokerLobby.getAddress(), buyIn);
        const handPublicKey = ethers.randomBytes(32);
        await pokerLobby.connect(player).registerSitAndGo(gameId, i, handPublicKey, invitePrivateKey);
      }
      const prizePool = buyIn * BigInt(maxPlayers);
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        player.initialBalance = await pokerChips.balanceOf(player);
        await pokerGame.connect(player).leaveGame(gameId);
      }
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        player.finalBalance = await pokerChips.balanceOf(player);
        const winnings = player.finalBalance - player.initialBalance;
        if (i === maxPlayers - 1) {
          expect(winnings).to.equal(prizePool);
        } else {
          expect(winnings).to.equal(0);
        }
      }
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("should not allow creating a game with invalid player count", async function () {
      const invalidMaxPlayers = 10; // Assuming the contract only allows up to 9 players
      const bigBlind = ethers.parseUnits("20", 6);
      const blindDuration = 900;
      const startingChips = ethers.parseUnits("10000", 6);
      const invitePublicKey = ethers.randomBytes(32);
      const buyIn = ethers.parseUnits("100", 6);

      await expect(pokerLobby.createSitAndGo(invalidMaxPlayers, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress()))
        .to.be.revertedWith("Invalid number of players");
    });

    it("should not allow joining a non-existent game", async function () {
      const nonExistentGameId = 999;
      const seat = 0;
      const handPublicKey = ethers.randomBytes(32);
      const invitePublicKey = ethers.randomBytes(32);

      await expect(pokerLobby.connect(addr1).joinCashGame(nonExistentGameId, seat, handPublicKey, invitePublicKey))
        .to.be.revertedWith("Game not found");
    });

    it("should not allow updating blinds too early", async function () {
      const maxPlayers = 6;
      const bigBlind = ethers.parseUnits("20", 6);
      const blindDuration = 900;
      const startingChips = ethers.parseUnits("10000", 6);
      const invitePublicKey = ethers.randomBytes(32);
      const buyIn = ethers.parseUnits("100", 6);

      await pokerLobby.createSitAndGo(maxPlayers, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress());

      await expect(pokerLobby.updateBlinds(1))
        .to.be.revertedWith("Game not started");
    });

    it("should not allow non-pokerGame address to end a game", async function () {
      const maxPlayers = 6;
      const bigBlind = ethers.parseUnits("2", 6);
      const invitePublicKey = ethers.randomBytes(32);
      const tx = await pokerLobby.createCashGame(maxPlayers, bigBlind, invitePublicKey, await pokerChips.getAddress());
      const receipt = await tx.wait();
      gameId = receipt.logs[1].args[0];
      await expect(pokerGame.connect(addr1).leaveGame(gameId))
        .to.be.revertedWith("Player not found");
    });
  });

  describe("Blinds Update", function () {
    it("should update blinds correctly", async function () {
      // Create a sit and go tournament
      let gameId;
    
      const bigBlind = ethers.parseUnits("20", 6);
      const blindDuration = 900;
      const startingChips = ethers.parseUnits("10000", 6);
      const invitePrivateKey = ethers.encodeBytes32String("secret1a");
      const invitePublicKey = ethers.keccak256(invitePrivateKey);
      const buyIn = ethers.parseUnits("100", 6);
      const maxPlayers = 9;
      const tx = await pokerLobby.createSitAndGo(9, bigBlind, blindDuration, startingChips, invitePublicKey, buyIn, await pokerChips.getAddress());
      const receipt = await tx.wait();
      gameId = receipt.logs[1].args[0];
      // Register all players
      for (let i = 0; i < maxPlayers; i++) {
        const player = players[i];
        await pokerChips.connect(player).mint(buyIn);
        await pokerChips.connect(player).approve(await pokerLobby.getAddress(), buyIn);
        const handPublicKey = ethers.randomBytes(32);
        await pokerLobby.connect(player).registerSitAndGo(gameId, i, handPublicKey, invitePrivateKey);
      }
  
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [blindDuration + 1]);
      await ethers.provider.send("evm_mine");

      // Update blinds
      await expect(pokerLobby.updateBlinds(1))
        .to.emit(pokerLobby, "BlindsUpdated")
        .withArgs(1, ethers.parseUnits("30", 6));

      const game = await pokerLobby.sitAndGos(1);
      expect(game.bigBlind).to.equal(ethers.parseUnits("30", 6));
    });
  });

  describe("End Game", function () {
    it("should end a cash game correctly", async function () {
      // Create and join a cash game
      const maxPlayers = 6;
      const bigBlind = ethers.parseUnits("2", 6);
      const invitePrivateKey = ethers.encodeBytes32String("secret1a");
      const invitePublicKey = ethers.keccak256(invitePrivateKey);
      await pokerLobby.createCashGame(maxPlayers, bigBlind, invitePublicKey, await pokerChips.getAddress());

      const buyIn = bigBlind * 100n;

      const initialBalance = await pokerChips.balanceOf(await addr1.getAddress());
      await pokerChips.connect(addr1).approve(await pokerLobby.getAddress(), buyIn);
      await pokerLobby.connect(addr1).joinCashGame(1, 0, ethers.randomBytes(32), invitePrivateKey);

      // End the game
      await expect(pokerGame.connect(addr1).leaveGame(gameId))
        .to.emit(pokerLobby, "GameEnded")
        .withArgs(1, await addr1.getAddress(), buyIn);

      // Check token transfer
      expect(await pokerChips.balanceOf(await addr1.getAddress())).to.equal(initialBalance);
    });
  });
});