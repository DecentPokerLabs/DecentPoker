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
    return shuffledDeck.slice(0, 7);
}

function checkPossibleOutcomes(finalBalances, possibleOutcomes) {
    for (let i = 0; i < possibleOutcomes.length; i++) {
        let outcome = possibleOutcomes[i];
        if (finalBalances.length !== outcome.length) return false;
        let correctOutcomes = 0;
        for (let j = 0; j < finalBalances.length; j++) {
            if (finalBalances[j] === outcome[j]) correctOutcomes++;
        }
        if (correctOutcomes === finalBalances.length) return true;
    }
    return false;
}

const nullHash = '0x' + '0'.repeat(64);

describe("PokerGame.sol Comprehensive Tests", function () {
    let pokerGame, handEvaluator, pokerChips, pokerDealer, usdc;
    let owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10] = await ethers.getSigners();

        const HandEvaluator = await ethers.getContractFactory("PokerHandEvaluator");
        handEvaluator = await HandEvaluator.deploy();

        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy("USD Coin", "USDC");

        const PokerChips = await ethers.getContractFactory("PokerChips");
        pokerChips = await PokerChips.deploy(await usdc.getAddress());

        const PokerDealer = await ethers.getContractFactory("PokerDealer");
        pokerDealer = await PokerDealer.deploy();

        const PokerGame = await ethers.getContractFactory("PokerGame");
        pokerGame = await PokerGame.deploy(
            await handEvaluator.getAddress(),
            await pokerChips.getAddress(),
            await pokerDealer.getAddress(),
        );

        for (const addr of [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10]) {
            await usdc.mint(addr.address, 1000000);
            await usdc.connect(addr).approve(await pokerChips.getAddress(), 100000);
            await pokerChips.connect(addr).depositUSDC(100000);
        }
    });

    describe("Game Creation", function () {
        it("Should fail to create a game with max players > 10", async function () {
            await expect(pokerGame.createGame(11, 2, nullHash))
                .to.be.revertedWith("Invalid number of players");
        });

        it("Should fail to create a game with max players < 2", async function () {
            await expect(pokerGame.createGame(1, 2, nullHash))
                .to.be.revertedWith("Invalid number of players");
        });

        it("Should fail to create a game with big blind = 0", async function () {
            await expect(pokerGame.createGame(6, 0, nullHash))
                .to.be.revertedWith("Invalid _bigBlind value");
        });
    });

    describe("Joining Game", function () {
        let gameId;

        beforeEach(async function () {
            const tx = await pokerGame.createGame(6, 2, nullHash);
            const receipt = await tx.wait();
            gameId = receipt.logs[0].args[0];
            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr2).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr3).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr4).approve(await pokerGame.getAddress(), 200);
        });

        it("Should fail to join a non-existent game", async function () {
            await expect(pokerGame.connect(addr1).joinGame(999, 0, ethers.randomBytes(32), nullHash))
                .to.be.revertedWith("Game not found");
        });

        it("Should fail to join a game twice", async function () {
            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 400);
            await pokerGame.connect(addr1).joinGame(gameId, 0, ethers.randomBytes(32), nullHash);
            await expect(pokerGame.connect(addr1).joinGame(gameId, 1, ethers.randomBytes(32), nullHash))
                .to.be.revertedWith("Already in game");
        });

        it("Should fail to join a occupied seat", async function () {
            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr2).approve(await pokerGame.getAddress(), 200);
            await pokerGame.connect(addr1).joinGame(gameId, 1, ethers.randomBytes(32), nullHash);
            await expect(pokerGame.connect(addr2).joinGame(gameId, 1, ethers.randomBytes(32), nullHash))
                .to.be.revertedWith("Seat taken");
        });

        it("Should fail to join a game with insufficient token approval", async function () {
            await pokerChips.connect(addr10).approve(await pokerGame.getAddress(), 50); // Insufficient approval
            await expect(pokerGame.connect(addr10).joinGame(gameId, 0, ethers.randomBytes(32), nullHash))
                .to.be.reverted;
        });
    
        it("Should fail to join a game with insufficient balance", async function () {
            await pokerChips.connect(addr10).approve(await pokerGame.getAddress(), 200);
            const bal = await pokerChips.balanceOf(addr10)
            await pokerChips.connect(addr10).transfer(owner.address, bal); // Drain balance
            await expect(pokerGame.connect(addr10).joinGame(gameId, 0, ethers.randomBytes(32), nullHash))
                .to.be.reverted;
        });

        it("Should correctly rotate dealer position", async function () {
            const handPrivateKey = ethers.encodeBytes32String("secret");
            const handPublicKey = ethers.keccak256(handPrivateKey);
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey, nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, handPublicKey, nullHash);
            await pokerGame.connect(addr3).joinGame(gameId, 5, handPublicKey, nullHash);
            await pokerGame.connect(addr4).joinGame(gameId, 2, handPublicKey, nullHash);
            await pokerGame.connect(addr1).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
            await pokerGame.connect(addr3).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr4).playerAction(gameId, 0, 0); // Fold
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey, ethers.randomBytes(32));
            await pokerGame.connect(addr1).dealHand(gameId);
            const dealer2 = await pokerGame.getDealer(gameId);
            expect(dealer2).to.equal(addr4.address);
        });

        it("Should allow setup and joining of a private game", async function () {
            const invitePrivateKey = ethers.randomBytes(32)
            const invitePublicKey = ethers.keccak256(invitePrivateKey);
            const tx = await pokerGame.createGame(6, 2, invitePublicKey);
            const receipt = await tx.wait();
            const gameId = receipt.logs[0].args[0];
            const handPrivateKey = ethers.encodeBytes32String("secret");
            const handPublicKey = ethers.keccak256(handPrivateKey);
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey, invitePrivateKey);
            await pokerGame.connect(addr2).joinGame(gameId, 3, handPublicKey, invitePrivateKey);
            await pokerGame.connect(addr1).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
        });

        it("Should reject a bad invite code", async function () {
            let invitePrivateKey = ethers.randomBytes(32);
            const invitePublicKey = ethers.keccak256(invitePrivateKey);
            const tx = await pokerGame.createGame(6, 2, invitePublicKey);
            const receipt = await tx.wait();
            const gameId = receipt.logs[0].args[0];
            const handPrivateKey = ethers.encodeBytes32String("secret");
            const handPublicKey = ethers.keccak256(handPrivateKey);
            invitePrivateKey = ethers.randomBytes(32); // make bad
            
            await expect(pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey, invitePrivateKey))
                .to.be.revertedWith("invitePrivateKey invalid");
        });

        it("Should allow a player to rejoin after leaving", async function () {
            await pokerGame.connect(addr1).joinGame(gameId, 0, ethers.randomBytes(32), nullHash);
            await pokerGame.connect(addr1).leaveGame(gameId);
            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 200);
            await pokerGame.connect(addr1).joinGame(gameId, 0, ethers.randomBytes(32), nullHash);
            const seatNo = await pokerGame.getSeat(gameId, addr1.address);
            expect(seatNo).to.equal(0);
        });

        it("Should fail to deal hand if not enough players have joined", async function () {
            await pokerGame.connect(addr1).joinGame(gameId, 0, ethers.randomBytes(32), nullHash);
            await expect(pokerGame.connect(addr1).dealHand(gameId))
                .to.be.revertedWith("Not enough players");
        });

    });

    describe("Simulate Hands", function () {
        let gameId;
        let initialBalance1;
        let initialBalance2;
        let initialBalance3;

        beforeEach(async function () {
            const tx = await pokerGame.connect(owner).createGame(9, 2, nullHash);
            const receipt = await tx.wait();
            gameId = receipt.logs[0].args[0];

            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 2000);
            await pokerChips.connect(addr2).approve(await pokerGame.getAddress(), 2000);
            await pokerChips.connect(addr3).approve(await pokerGame.getAddress(), 2000);
            await pokerChips.connect(addr4).approve(await pokerGame.getAddress(), 2000);
            await pokerChips.connect(addr5).approve(await pokerGame.getAddress(), 2000);
            await pokerChips.connect(addr6).approve(await pokerGame.getAddress(), 2000);
            await pokerChips.connect(addr7).approve(await pokerGame.getAddress(), 2000);
            await pokerChips.connect(addr8).approve(await pokerGame.getAddress(), 2000);
            await pokerChips.connect(addr9).approve(await pokerGame.getAddress(), 2000);
        });

        it("Should simulate heads up play", async function () {
            initialBalance1 = await pokerGame.getChips(gameId,addr1.address);
            initialBalance2 = await pokerGame.getChips(gameId,addr1.address);
            const handPrivateKey1 = ethers.encodeBytes32String("secret1");
            const handPublicKey1 = ethers.keccak256(handPrivateKey1);
            const handPrivateKey2 = ethers.encodeBytes32String("secret2");
            const handPublicKey2 = ethers.keccak256(handPrivateKey2);
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey1, nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, handPublicKey2, nullHash);
            await pokerGame.connect(owner).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
            const hid = pokerGame.getHandId(gameId);
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
            const blockHash = await pokerDealer.getHash(hid);
            const cards1 = shuffleAndDeal(blockHash, handPrivateKey1);
            const cards2 = shuffleAndDeal(blockHash, handPrivateKey2);

            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check - heads up bb goes first preflop
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check - dealer goes first all other rounds
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId,addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId,addr2.address);
            expect(finalBalance1 + finalBalance2).to.equal(400);
        });

        it("Should simulate 3 player game", async function () {
            initialBalance1 = await pokerGame.getChips(gameId,addr1.address);
            initialBalance2 = await pokerGame.getChips(gameId,addr2.address);
            initialBalance3 = await pokerGame.getChips(gameId,addr3.address);
            const handPrivateKey1 = ethers.encodeBytes32String("secret1");
            const handPublicKey1 = ethers.keccak256(handPrivateKey1);
            const handPrivateKey2 = ethers.encodeBytes32String("secret2");
            const handPublicKey2 = ethers.keccak256(handPrivateKey2);
            const handPrivateKey3 = ethers.encodeBytes32String("secret3");
            const handPublicKey3 = ethers.keccak256(handPrivateKey3);
            await pokerGame.connect(addr1).joinGame(gameId, 0, handPublicKey1, nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 1, handPublicKey2, nullHash);
            await pokerGame.connect(addr3).joinGame(gameId, 2, handPublicKey3, nullHash);
            await pokerGame.connect(addr1).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr2.address);
            const hid = pokerGame.getHandId(gameId);
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
            const blockHash = await pokerDealer.getHash(hid);
            const cards1 = shuffleAndDeal(blockHash, handPrivateKey1);
            const cards2 = shuffleAndDeal(blockHash, handPrivateKey2);
            const cards3 = shuffleAndDeal(blockHash, handPrivateKey3);
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, ethers.randomBytes(32));
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId,addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId,addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId,addr3.address);
            expect(finalBalance1).to.not.equal(initialBalance1); // Balance should change
            expect(finalBalance2).to.not.equal(initialBalance2); // Balance should change
            expect(finalBalance3).to.not.equal(initialBalance3); // Balance should change
        });

        it("Should simulate 9 player game", async function () {

            const players = [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9];

            const handPrivateKeys = [
                ethers.encodeBytes32String("secret1"),
                ethers.encodeBytes32String("secret2"),
                ethers.encodeBytes32String("secret3"),
                ethers.encodeBytes32String("secret4"),
                ethers.encodeBytes32String("secret5"),
                ethers.encodeBytes32String("secret6"),
                ethers.encodeBytes32String("secret7"),
                ethers.encodeBytes32String("secret8"),
                ethers.encodeBytes32String("secret9")
            ];
        
            const handPublicKeys = handPrivateKeys.map(pk => ethers.keccak256(pk));
        
            for (let p = 0; p < 9; p++) {
                await pokerGame.connect(players[p]).joinGame(gameId, p, handPublicKeys[p], nullHash);
            }
            
            await pokerGame.connect(addr1).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr2.address);
        
            const hid = pokerGame.getHandId(gameId);
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
            const blockHash = await pokerDealer.getHash(hid);
        
            const cards = handPrivateKeys.map(pk => shuffleAndDeal(blockHash, pk));
        
            await pokerGame.connect(addr5).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr6).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr7).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr8).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr9).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr4).playerAction(gameId, 1, 0); // Check
            // Flop
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr4).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr5).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr6).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr7).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr8).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr9).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            // Turn          
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr4).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr5).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr6).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr7).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr8).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr9).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            // River
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr4).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr5).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr6).playerAction(gameId, 3, 50); // Raise
            await pokerGame.connect(addr7).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr8).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr9).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call      
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr4).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr5).playerAction(gameId, 2, 0); // Call

            for (let i = 0; i < 9; i++) {
                await pokerGame.connect(players[i]).revealHand(gameId, handPrivateKeys[i], ethers.randomBytes(32));
            }
        
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(0); // Waiting
        
            const finalBalances = await Promise.all([
                pokerGame.getChips(gameId,addr1.address),
                pokerGame.getChips(gameId,addr2.address),
                pokerGame.getChips(gameId,addr3.address),
                pokerGame.getChips(gameId,addr4.address),
                pokerGame.getChips(gameId,addr5.address),
                pokerGame.getChips(gameId,addr6.address),
                pokerGame.getChips(gameId,addr7.address),
                pokerGame.getChips(gameId,addr8.address),
                pokerGame.getChips(gameId,addr9.address)
            ]);
            let total = 0n;
            for (let i = 0; i < 9; i++) {
                total += finalBalances[i];
            }
            expect(total).to.equal(1800n);
        });
    });

    describe("Game Flow", function () {
        let gameId;

        beforeEach(async function () {
            const tx = await pokerGame.createGame(6, 2, nullHash);
            const receipt = await tx.wait();
            gameId = receipt.logs[0].args[0];
            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr2).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr3).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr4).approve(await pokerGame.getAddress(), 200);
        });

        it("Should fail to deal hand before minimum players have joined", async function () {
            await pokerGame.connect(addr1).joinGame(gameId, 1, ethers.randomBytes(32), nullHash);
            await expect(pokerGame.connect(addr1).dealHand(gameId))
                .to.be.revertedWith("Not enough players");
        });

        it("Should fail to take action when it's not player's turn", async function () {
            await pokerGame.connect(addr1).joinGame(gameId, 1, ethers.randomBytes(32), nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, ethers.randomBytes(32), nullHash);
            await pokerGame.connect(addr3).joinGame(gameId, 5, ethers.randomBytes(32), nullHash);
            await pokerGame.connect(addr1).dealHand(gameId);
            await expect(pokerGame.connect(addr2).playerAction(gameId, 1, 0))
                .to.be.revertedWith("It's not your turn");
        });

        it("Should fail to take invalid action", async function () {
            await pokerGame.connect(addr1).joinGame(gameId, 1, ethers.randomBytes(32), nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, ethers.randomBytes(32), nullHash);
            await pokerGame.connect(addr1).dealHand(gameId);
            await expect(pokerGame.connect(addr3).playerAction(gameId, 5, 0))
                .to.be.reverted;
        });

        it("Should fail to reveal hand before showdown", async function () {
            await pokerGame.connect(addr1).joinGame(gameId, 1, ethers.randomBytes(32), nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, ethers.randomBytes(32), nullHash);
            await pokerGame.connect(addr1).dealHand(gameId);
            await expect(pokerGame.connect(addr1).revealHand(gameId, ethers.randomBytes(32), ethers.randomBytes(32)))
                .to.be.revertedWith("Not in showdown state");
        });

        it("Should correctly handle all-in situations", async function () {
            const handPrivateKey1 = ethers.encodeBytes32String("secrets1");
            const handPublicKey1 = ethers.keccak256(handPrivateKey1);
            const handPrivateKey2 = ethers.encodeBytes32String("secrets2");
            const handPublicKey2 = ethers.keccak256(handPrivateKey2);
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey1, nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, handPublicKey2, nullHash);
            initialBalance1 = await pokerGame.getChips(gameId, addr1.address);
            initialBalance2 = await pokerGame.getChips(gameId, addr2.address);
            await pokerGame.connect(owner).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
            const hid = pokerGame.getHandId(gameId);
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
            await pokerGame.connect(addr2).playerAction(gameId, 3, 200); // Raise all-in
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            expect(finalBalance1 + finalBalance2).to.equal(initialBalance1 + initialBalance2);
        });

        it("Should correctly handle double raises", async function () {
            const handPrivateKey1 = ethers.encodeBytes32String("secret1");
            const handPublicKey1 = ethers.keccak256(handPrivateKey1);
            const handPrivateKey2 = ethers.encodeBytes32String("secret2");
            const handPublicKey2 = ethers.keccak256(handPrivateKey2);
            const handPrivateKey3 = ethers.encodeBytes32String("secret3");
            const handPublicKey3 = ethers.keccak256(handPrivateKey3);
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey1, nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, handPublicKey2, nullHash);
            await pokerGame.connect(addr3).joinGame(gameId, 5, handPublicKey3, nullHash)
            await pokerGame.connect(addr1).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
            await pokerGame.connect(addr1).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr2).playerAction(gameId, 3, 40); // ReRaise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            let game = await pokerGame.games(gameId);
            expect(game.state).to.equal(2); // Flop
            for (let i = 0; i < 3; i++) {
                await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
                await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
                await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            }
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
        });

        it("Should handle a game where players have exactly the same hand", async function () {
            const handPrivateKey1 = ethers.encodeBytes32String("secret1");
            const handPublicKey1 = ethers.keccak256(handPrivateKey1);
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey1, nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, handPublicKey1, nullHash);
            await pokerGame.connect(addr3).joinGame(gameId, 5, handPublicKey1, nullHash)
            const initialBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const initialBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const initialBalance3 = await pokerGame.getChips(gameId, addr3.address);
            await pokerGame.connect(addr1).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
            await pokerGame.connect(addr1).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr2).playerAction(gameId, 3, 40); // ReRaise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            for (let i = 0; i < 3; i++) {
                await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
                await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
                await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            }
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance1).to.equal(initialBalance1);
            expect(finalBalance2).to.equal(initialBalance2);
            expect(finalBalance3).to.equal(initialBalance3);
        });
    });

    describe("Standard Game", function () {
        let gameId, initialBalance1, initialBalance2, initialBalance3;
        let handPrivateKey1, handPrivateKey2, handPrivateKey3, handPublicKey1, handPublicKey2, handPublicKey3;

        beforeEach(async function () {
            const tx = await pokerGame.createGame(6, 2, nullHash);
            const receipt = await tx.wait();
            gameId = receipt.logs[0].args[0];
            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr2).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr3).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr4).approve(await pokerGame.getAddress(), 200);
            handPrivateKey1 = ethers.encodeBytes32String("secret1");
            handPublicKey1 = ethers.keccak256(handPrivateKey1);
            handPrivateKey2 = ethers.encodeBytes32String("secret2");
            handPublicKey2 = ethers.keccak256(handPrivateKey2);
            handPrivateKey3 = ethers.encodeBytes32String("secret3");
            handPublicKey3 = ethers.keccak256(handPrivateKey3);
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey1, nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, handPublicKey2, nullHash);
            await pokerGame.connect(addr3).joinGame(gameId, 5, handPublicKey3, nullHash);
            initialBalance1 = await pokerGame.getChips(gameId, addr1.address);
            initialBalance2 = await pokerGame.getChips(gameId, addr2.address);
            initialBalance3 = await pokerGame.getChips(gameId, addr3.address);
            await pokerGame.connect(owner).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
        });

        it("Should handle a game where all players but one fold", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 3, 20); // Raise
            await pokerGame.connect(addr2).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr3).playerAction(gameId, 0, 0); // Fold
            await ethers.provider.send("evm_mine", []);
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance1).to.not.equal(initialBalance1);
            expect(finalBalance2).to.not.equal(initialBalance2);
            expect(finalBalance3).to.not.equal(initialBalance3);
        });

        it("Should handle a game where all players check until the end", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call (dealer)
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call (small blind)
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check (big blind)
            
            for (let i = 0; i < 3; i++) {
                await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
                await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
                await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            }
            
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance1).to.not.equal(initialBalance1);
            expect(finalBalance2).to.not.equal(initialBalance2);
            expect(finalBalance3).to.not.equal(initialBalance3);
        });
        
        it("Dealer shoves and others call", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 3, initialBalance2); // All-in (small blind)
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call (big blind)
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call (dealer)
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance1).to.not.equal(200);
            expect(finalBalance2).to.not.equal(200);
            expect(finalBalance3).to.not.equal(200);
            expect(finalBalance1 + finalBalance2 + finalBalance3).to.equal(600);
        });
        
        it("Should handle a game where two players go all-in and one folds", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 3, initialBalance1); // All-in
            await pokerGame.connect(addr2).playerAction(gameId, 2, initialBalance2); // All-in
            await pokerGame.connect(addr3).playerAction(gameId, 0, 0); // Fold
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance1 + finalBalance2 + finalBalance3).to.equal(600);
            expect(finalBalance3).to.be.lt(initialBalance3);
        });
        
        it("Should handle a game where one player raises and others fold after the flop", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 3, 50); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance2).to.be.gt(initialBalance2);
            expect(finalBalance1).to.be.lt(initialBalance1);
            expect(finalBalance3).to.be.lt(initialBalance3);
        });
        
        it("Should handle a game where players make multiple raises", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 3, 20); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 3, 20); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 0, 0); // Fold
            let game = await pokerGame.games(gameId);
            expect(game.state).to.equal(3);
            await pokerGame.connect(addr3).playerAction(gameId, 3, 20); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr3).playerAction(gameId, 3, 20); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32)); // reveals anyway
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance1).to.not.equal(200);
            expect(finalBalance2).to.not.equal(200);
            expect(finalBalance3).to.not.equal(200);
            expect(finalBalance1 + finalBalance2 + finalBalance3).to.equal(600);
        });

        it("Should fail when a player tries to raise more than balance", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await expect(pokerGame.connect(addr2).playerAction(gameId, 3, 201))
            .to.be.revertedWith("Raise too high");
        });
    });

    describe("Side Pots", function () {
        let gameId, initialBalance1, initialBalance2, initialBalance3;
        let handPrivateKey1, handPrivateKey2, handPrivateKey3, handPublicKey1, handPublicKey2, handPublicKey3;

        beforeEach(async function () {
            const tx = await pokerGame.createGame(6, 2, nullHash);
            const receipt = await tx.wait();
            gameId = receipt.logs[0].args[0];
            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr2).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr3).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr4).approve(await pokerGame.getAddress(), 200);
            handPrivateKey1 = ethers.encodeBytes32String("secret1");
            handPublicKey1 = ethers.keccak256(handPrivateKey1);
            handPrivateKey2 = ethers.encodeBytes32String("secret2");
            handPublicKey2 = ethers.keccak256(handPrivateKey2);
            handPrivateKey3 = ethers.encodeBytes32String("secret3");
            handPublicKey3 = ethers.keccak256(handPrivateKey3);
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey1, nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, handPublicKey2, nullHash);
            await pokerGame.connect(addr3).joinGame(gameId, 5, handPublicKey3, nullHash);
            initialBalance1 = await pokerGame.getChips(gameId, addr1.address);
            initialBalance2 = await pokerGame.getChips(gameId, addr2.address);
            initialBalance3 = await pokerGame.getChips(gameId, addr3.address);
            await pokerGame.connect(owner).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
        });

        it("Should handle an all-in pot where one player has more funds than the other", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 3, 50); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            newHandPrivateKey2 = ethers.encodeBytes32String("secret2b");
            newHandPublicKey2 = ethers.keccak256(newHandPrivateKey2);
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, newHandPublicKey2);
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const balance1 = await pokerGame.getChips(gameId, addr1.address);
            const balance2 = await pokerGame.getChips(gameId, addr2.address);
            const balance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(balance1).to.equal(150);
            expect(balance2).to.equal(300);
            expect(balance3).to.equal(150);
            await pokerGame.connect(owner).dealHand(gameId);
            await pokerGame.connect(addr2).playerAction(gameId, 3, 300); // Raise All-In 300
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call 150
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call 150
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, newHandPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, ethers.randomBytes(32));
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            const balances = [finalBalance1, finalBalance2, finalBalance3];
            console.log(balances);
            const possibleOutcomes = [[450n, 150n, 0n], [0n, 600n, 0n], [0n, 150n, 450n], [225n, 375n, 0n], [225n, 150n, 225n], [0n, 375n, 225n], [200n, 200n, 200n], [150n, 300n, 150n]];
            expect(checkPossibleOutcomes(balances, possibleOutcomes)).to.equal(true);
        });

        it("Should handle a small shove when nothings left to bet", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 3, 50); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            newHandPrivateKey2 = ethers.encodeBytes32String("secret2b");
            newHandPublicKey2 = ethers.keccak256(newHandPrivateKey2);
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, newHandPublicKey2);
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const balance1 = await pokerGame.getChips(gameId, addr1.address);
            const balance2 = await pokerGame.getChips(gameId, addr2.address);
            const balance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(balance1).to.equal(150);
            expect(balance2).to.equal(300);
            expect(balance3).to.equal(150);
            await pokerGame.connect(owner).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr2.address);
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 3, 150); // Raise All-In 150
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call 150
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(1); // preflop
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call 150
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, newHandPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, ethers.randomBytes(32));
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            const balances = [finalBalance1, finalBalance2, finalBalance3];
            console.log(balances);
            const possibleOutcomes = [[450n, 150n, 0n], [0n, 600n, 0n], [0n, 150n, 450n], [225n, 375n, 0n], [225n, 150n, 225n], [0n, 375n, 225n], [200n, 200n, 200n], [150n, 300n, 150n]];
            expect(checkPossibleOutcomes(balances, possibleOutcomes)).to.equal(true);
        });

        
        it("Should handle a multi shove game small > bigger > call", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 3, 50); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            newHandPrivateKey2 = ethers.encodeBytes32String("secret2b");
            newHandPublicKey2 = ethers.keccak256(newHandPrivateKey2);
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, newHandPublicKey2);
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const balance1 = await pokerGame.getChips(gameId, addr1.address);
            const balance2 = await pokerGame.getChips(gameId, addr2.address);
            const balance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(balance1).to.equal(150);
            expect(balance2).to.equal(300);
            expect(balance3).to.equal(150);
            await pokerGame.connect(owner).dealHand(gameId);
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 3, 150); // Raise All-In 150
            await pokerGame.connect(addr2).playerAction(gameId, 3, 300); // Raise All-In 300
            await pokerGame.connect(addr3).playerAction(gameId, 2, 150); // Call 150
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, newHandPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, ethers.randomBytes(32));
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            const balances = [finalBalance1, finalBalance2, finalBalance3];
            console.log(balances);
            const possibleOutcomes = [[450n, 150n, 0n], [0n, 600n, 0n], [0n, 150n, 450n], [225n, 375n, 0n], [225n, 150n, 225n], [0n, 375n, 225n], [200n, 200n, 200n], [150n, 300n, 150n]];
            expect(checkPossibleOutcomes(balances, possibleOutcomes)).to.equal(true);
        });

        it("Should handle a game where a short stack goes all-in and the game continues", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 3, 50); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            handPrivateKey2b = ethers.encodeBytes32String("secret2b");
            handPublicKey2b = ethers.keccak256(handPrivateKey2b);
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, handPublicKey2b);
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(0); // Waiting
            await pokerGame.connect(owner).dealHand(gameId);
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 3, 50); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr3).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr2).playerAction(gameId, 0, 0); // Fold
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            handPrivateKey3b = ethers.encodeBytes32String("secret3b");
            handPublicKey3b = ethers.keccak256(handPrivateKey3b);
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, handPublicKey3b);
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting

            const balance1 = await pokerGame.getChips(gameId, addr1.address);
            const balance2 = await pokerGame.getChips(gameId, addr2.address);
            const balance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(balance1).to.equal(100);
            expect(balance2).to.equal(250);
            expect(balance3).to.equal(250);
            await pokerGame.connect(owner).dealHand(gameId);
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 3, 100); // Raise 100
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(2); // flop

            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 3, 150); // Raise 150
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2b, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3b, ethers.randomBytes(32));
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            const balances = [finalBalance1, finalBalance2, finalBalance3];
            console.log(balances);
            const possibleOutcomes = [[300n, 300n, 0n], [300n, 0n, 300n], [0n, 600n, 0n], [0n, 0n, 600n], [150n, 450n, 0n], [150n, 0n, 450n], [0n, 400n, 200n], [100n, 350n, 150n], [0n, 300n, 300n], [100n, 250, 250n]];
            expect(checkPossibleOutcomes(balances, possibleOutcomes)).to.equal(true);
        });

        it("Should handle multiple different balances", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 3, 50); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            handPrivateKey2b = ethers.encodeBytes32String("secret2b");
            handPublicKey2b = ethers.keccak256(handPrivateKey2b);
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, handPublicKey2b);
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(0); // Waiting
            await pokerGame.connect(owner).dealHand(gameId);
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 3, 20); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr3).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr2).playerAction(gameId, 0, 0); // Fold
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            handPrivateKey3b = ethers.encodeBytes32String("secret3b");
            handPublicKey3b = ethers.keccak256(handPrivateKey3b);
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, handPublicKey3b);
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting

            const balance1 = await pokerGame.getChips(gameId, addr1.address);
            const balance2 = await pokerGame.getChips(gameId, addr2.address);
            const balance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(balance1).to.equal(130);
            expect(balance2).to.equal(280);
            expect(balance3).to.equal(190);
            await pokerGame.connect(owner).dealHand(gameId);
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 3, 130); // Raise 100
            await pokerGame.connect(addr2).playerAction(gameId, 3, 280); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // showdown
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2b, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3b, ethers.randomBytes(32));
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            const balances = [finalBalance1, finalBalance2, finalBalance3];
            console.log(balances);
            const possibleOutcomes = [[390n, 210n, 0n], [0n, 600n, 0n], [0n, 0n, 600n], [390n, 90n, 120n], [195n, 345n, 0n], [195n, 210n, 195n], [0n, 345n, 255n], [130n, 340n, 130n], [0n, 90n, 510n], [390n, 150n, 60n],[130n, 280n, 190n]];
            expect(checkPossibleOutcomes(balances, possibleOutcomes)).to.equal(true);
        });

    });

    describe("Leaving & Timeouts", function () {
        let gameId, initialBalance1, initialBalance2, initialBalance3;
        let handPrivateKey1, handPrivateKey2, handPrivateKey3, handPublicKey1, handPublicKey2, handPublicKey3;

        beforeEach(async function () {
            const tx = await pokerGame.createGame(6, 2, nullHash);
            const receipt = await tx.wait();
            gameId = receipt.logs[0].args[0];
            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr2).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr3).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr4).approve(await pokerGame.getAddress(), 200);
            handPrivateKey1 = ethers.encodeBytes32String("secret1");
            handPublicKey1 = ethers.keccak256(handPrivateKey1);
            handPrivateKey2 = ethers.encodeBytes32String("secret2");
            handPublicKey2 = ethers.keccak256(handPrivateKey2);
            handPrivateKey3 = ethers.encodeBytes32String("secret3");
            handPublicKey3 = ethers.keccak256(handPrivateKey3);
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey1, nullHash);
            await pokerGame.connect(addr2).joinGame(gameId, 3, handPublicKey2, nullHash);
            await pokerGame.connect(addr3).joinGame(gameId, 5, handPublicKey3, nullHash);
            initialBalance1 = await pokerGame.getChips(gameId, addr1.address);
            initialBalance2 = await pokerGame.getChips(gameId, addr2.address);
            initialBalance3 = await pokerGame.getChips(gameId, addr3.address);
            await pokerGame.connect(owner).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_mine", []);
        });

        it("Should handle a player leaving mid game", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).leaveGame(gameId); // Leave Game
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(3);
            const action = await pokerGame.getAction(gameId);
            const actionSeat = await pokerGame.getSeat(gameId, action);
            expect(actionSeat).to.equal(3);
            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance3).to.equal(0);
        });

        it("Should handle dealer leaving mid game", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr1).leaveGame(gameId); // Leave Game

            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(3);
            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey3, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            expect(finalBalance1).to.equal(0);
        });

        it("Should handle a player exodus mid game", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).leaveGame(gameId); // Leave Game
            await pokerGame.connect(addr1).leaveGame(gameId); // Leave Game

            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5);
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            expect(finalBalance1).to.equal(0);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance3).to.equal(0);
        });

        it("Should handle a player getting autofolded mid game", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await ethers.provider.send("evm_increaseTime", [300]);
            await ethers.provider.send("evm_mine", []); 
            await pokerGame.connect(addr2).autoFold(gameId); // Auto Fold Player 3
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            const game = await pokerGame.games(gameId);
            expect(game.state).to.equal(3);
            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey1, ethers.randomBytes(32));
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            expect(finalBalance3).to.equal(0);
        });

        it("Should handle a non-revealer getting autofolded at showdown", async function () {
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr3).leaveGame(gameId); // Leave Game
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey2, ethers.randomBytes(32));
            await ethers.provider.send("evm_increaseTime", [300]);
            await ethers.provider.send("evm_mine", []); 
            await pokerGame.connect(addr2).autoFold(gameId);
            await pokerGame.connect(addr2).closeHand(gameId);
            const newGame = await pokerGame.games(gameId);
            expect(newGame.state).to.equal(0); // Waiting
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            expect(finalBalance2).to.be.gt(initialBalance2);
        });
    });

    describe("Split Pot Scenarios", function () {
        let gameId, initialBalance1, initialBalance2, initialBalance3, initialBalance4;
        let handPrivateKey, handPublicKey;

        beforeEach(async function () {
            const tx = await pokerGame.createGame(6, 2, nullHash);
            const receipt = await tx.wait();
            gameId = receipt.logs[0].args[0];
            await pokerChips.connect(addr1).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr2).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr3).approve(await pokerGame.getAddress(), 200);
            await pokerChips.connect(addr4).approve(await pokerGame.getAddress(), 200);

            handPrivateKey = ethers.encodeBytes32String("sharedSecret");
            handPublicKey = ethers.keccak256(handPrivateKey);
        });

        it("Should correctly split the pot between two players in a 4 way game", async function () {
            
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey, nullHash); // same cards
            await pokerGame.connect(addr2).joinGame(gameId, 2, handPublicKey, nullHash); // same cards
            await pokerGame.connect(addr3).joinGame(gameId, 3, handPublicKey, nullHash); // same cards
            await pokerGame.connect(addr4).joinGame(gameId, 4, handPublicKey, nullHash); // same cards
            initialBalance1 = await pokerGame.getChips(gameId, addr1.address);
            initialBalance2 = await pokerGame.getChips(gameId, addr2.address);
            initialBalance3 = await pokerGame.getChips(gameId, addr3.address);
            initialBalance4 = await pokerGame.getChips(gameId, addr4.address);
            await pokerGame.connect(owner).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);
            await pokerGame.connect(addr4).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 10); // Call
            await pokerGame.connect(addr2).playerAction(gameId, 2, 0); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 2, 0); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr4).playerAction(gameId, 2, 10); // Call
            await pokerGame.connect(addr1).playerAction(gameId, 0, 0); // Fold
            await pokerGame.connect(addr2).playerAction(gameId, 0, 0); // Fold

            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr4).playerAction(gameId, 1, 0); // Check
            let game = await pokerGame.games(gameId);
            expect(game.state).to.equal(4); // River
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr4).playerAction(gameId, 1, 0); // Check
            game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // Showdown
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey, ethers.randomBytes(32));
            await pokerGame.connect(addr4).revealHand(gameId, handPrivateKey, ethers.randomBytes(32));

            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);
            const finalBalance4 = await pokerGame.getChips(gameId, addr4.address);

            expect(finalBalance1).to.equal(190); // Lost chips
            expect(finalBalance2).to.equal(190); // Lost chips
            expect(finalBalance3).to.equal(210); // Split the pot
            expect(finalBalance4).to.equal(210); // Split the pot
        });

        it("Should correctly split the pot between two players in a heads up game", async function () {
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey, nullHash); // same cards
            await pokerGame.connect(addr2).joinGame(gameId, 2, handPublicKey, nullHash); // same cards
            initialBalance1 = await pokerGame.getChips(gameId, addr1.address);
            initialBalance2 = await pokerGame.getChips(gameId, addr2.address);
            await pokerGame.connect(owner).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);

            await pokerGame.connect(addr2).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr1).playerAction(gameId, 2, 10); // Call

            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check

            let game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // Showdown

            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey, ethers.randomBytes(32));

            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);

            expect(finalBalance1).to.equal(initialBalance1);
            expect(finalBalance2).to.equal(initialBalance2);
        });

        it("Should correctly split the pot three ways", async function () {
            await pokerGame.connect(addr1).joinGame(gameId, 1, handPublicKey, nullHash); // same cards
            await pokerGame.connect(addr2).joinGame(gameId, 2, handPublicKey, nullHash); // same cards
            await pokerGame.connect(addr3).joinGame(gameId, 3, handPublicKey, nullHash); // same cards
            initialBalance1 = await pokerGame.getChips(gameId, addr1.address);
            initialBalance2 = await pokerGame.getChips(gameId, addr2.address);
            await pokerGame.connect(owner).dealHand(gameId);
            const dealer = await pokerGame.getDealer(gameId);
            expect(dealer).to.equal(addr1.address);

            await pokerGame.connect(addr1).playerAction(gameId, 3, 10); // Raise
            await pokerGame.connect(addr2).playerAction(gameId, 2, 10); // Call
            await pokerGame.connect(addr3).playerAction(gameId, 2, 10); // Call

            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check

            await pokerGame.connect(addr2).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr3).playerAction(gameId, 1, 0); // Check
            await pokerGame.connect(addr1).playerAction(gameId, 1, 0); // Check

            let game = await pokerGame.games(gameId);
            expect(game.state).to.equal(5); // Showdown

            await pokerGame.connect(addr1).revealHand(gameId, handPrivateKey, ethers.randomBytes(32));
            await pokerGame.connect(addr2).revealHand(gameId, handPrivateKey, ethers.randomBytes(32));
            await pokerGame.connect(addr3).revealHand(gameId, handPrivateKey, ethers.randomBytes(32));

            const finalBalance1 = await pokerGame.getChips(gameId, addr1.address);
            const finalBalance2 = await pokerGame.getChips(gameId, addr2.address);
            const finalBalance3 = await pokerGame.getChips(gameId, addr3.address);

            expect(finalBalance1).to.equal(initialBalance1);
            expect(finalBalance2).to.equal(initialBalance2);
            expect(finalBalance3).to.equal(initialBalance3);
        });
    });

});
