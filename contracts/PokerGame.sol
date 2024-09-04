// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//import 'hardhat/console.sol';

/**
 * @title PokerGame
 * @author decentpokerlabs@proton.me
 * @notice Poker Game Mechanics
 *   ____                      _   ____       _             
 *  |  _ \  ___  ___ ___ _ __ | |_|  _ \ ___ | | _____ _ __ 
 *  | | | |/ _ \/ __/ _ \ '_ \| __| |_| / _ \| |/ / _ \  __|
 *  | |_| |  __/ |_|  __/ | | | |_|  __/ |_| |   <  __/ |   
 *  |____/ \___|\___\___|_| |_|\__|_|   \___/|_|\_\___|_|   
 *                                                          
 *       The Open Decentralized Poker Project               
 *            https://decentpoker.org                       
 */

interface IPokerHandEvaluator {
    function determineWinners(uint8[7][9] memory hands) external pure returns (bool[9] memory);
}

interface IPokerDealer {
    function createHand(uint _gid, address[] memory _players, bytes32[] memory _publicKeys) external returns (uint);
    function updateNextBlock(uint _hid) external;
    function flop(uint _hid) external;
    function turn(uint _hid) external;
    function river(uint _hid) external;
    function close(uint _hid, bytes32[] memory _privateKeys) external returns (bool);
    function getFlop(uint _hid) external view returns (uint8, uint8, uint8);
    function getTurn(uint _hid) external view returns (uint8);
    function getRiver(uint _hid) external view returns (uint8);
    function getCards(uint _hid, bytes32 _privateKey) external view returns (uint8[7] memory);
}

interface IPokerLobby {
    function endGame(uint _gid, address _player, uint _chips) external;
}

contract PokerGame {
    enum GameState { Waiting, PreFlop, Flop, Turn, River, Showdown }
    enum PlayerAction { Fold, Check, Call, Raise }

    struct Player {
        address addr;
        uint chips;
        uint currentBet;
        bool hasFolded;
        bool hasActed;
        bytes32 handPublicKey;
        bytes32 handPrivateKey;
    }

    struct Pot {
        uint amount;
        uint maxAmount;
        uint[9] contributed;
    }

    struct Game {
        GameState state;
        uint hid;
        Pot[8] pots;
        uint potTotal;
        uint currentBet;
        uint lastActionBlock;
        uint lastActionTimestamp;
        uint bigBlind;
        uint8 maxPlayers;
        uint8 dealerSeat;
        uint8 actionOnSeat;
        bool headsUp;
        mapping(uint8 => Player) players;
    }

    IPokerHandEvaluator public handEvaluator;
    IPokerDealer public pokerDealer;
    IPokerLobby public pokerLobby;

    mapping(uint => Game) public games;
    uint public gameCount;

    event GameCreated(uint indexed gid, uint8 maxPlayers, uint bigBlind);
    event PlayerJoined(uint indexed gid, address player, uint8 seatIndex);
    event NewHand(uint indexed gid, uint hid, address[] players, bytes32[] handPublicKeys);
    event NewRound(uint indexed gid, GameState state);
    event Action(uint indexed gid, address player, PlayerAction action, uint amount);
    event Winner(uint indexed gid, uint hid, address winner, uint amount);

    constructor(address _handEvaluator, address _pokerDealer, address _pokerLobby) {
        handEvaluator = IPokerHandEvaluator(_handEvaluator);
        pokerDealer = IPokerDealer(_pokerDealer);
        pokerLobby = IPokerLobby(_pokerLobby);
    }

    function createGame(uint8 _maxPlayers, uint _bigBlind) external returns (uint) {
        require(msg.sender == address(pokerLobby), "Create games through pokerLobby");
        require(_maxPlayers >= 2 && _maxPlayers <= 9, "Invalid number of players");
        require(_bigBlind >= 2, "Invalid _bigBlind value");
        gameCount++;
        Game storage newGame = games[gameCount];
        newGame.maxPlayers = _maxPlayers;
        newGame.bigBlind = _bigBlind;
        newGame.state = GameState.Waiting;
        emit GameCreated(gameCount, _maxPlayers, _bigBlind);
        return gameCount;
    }

    function joinGame(uint _gid, address _player, uint8 _seatIndex, bytes32 _handPublicKey) external {
        require(msg.sender == address(pokerLobby), "Join games through pokerLobby");
        Game storage game = games[_gid];
        require(game.state == GameState.Waiting, "Not ready");
        require(game.maxPlayers >= 2, "Game not found");
        require(_seatIndex < game.maxPlayers, "Invalid seat index");
        require(game.players[_seatIndex].addr == address(0), "Seat taken");
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            require(game.players[i].addr != _player, "Already in game");
        }
        uint buyIn = game.bigBlind * 100;
        game.players[_seatIndex] = Player({
            addr: _player,
            chips: buyIn,
            currentBet: 0,
            hasFolded: false,
            hasActed: false,
            handPublicKey: _handPublicKey,
            handPrivateKey: 0x0
        });
        emit PlayerJoined(_gid, _player, _seatIndex);
    }

    function updateBlinds(uint _gid, uint _bigBlind) external {
        require(msg.sender == address(pokerLobby), "updateBlinds through pokerLobby");
        games[_gid].bigBlind = _bigBlind;
    }

    function dealHand(uint _gid) external {
        Game storage game = games[_gid];
        require(game.state == GameState.Waiting, "Not ready");
        uint8 activePlayers = getActivePlayers(game);
        require(activePlayers >= 2, "Not enough players");
        game.state = GameState.PreFlop;
        game.dealerSeat = getNextActiveSeat(game, game.dealerSeat);
        game.actionOnSeat = getNextActiveSeat(game, game.dealerSeat);
        game.actionOnSeat = getNextActiveSeat(game, game.actionOnSeat);
        game.actionOnSeat = getNextActiveSeat(game, game.actionOnSeat);
        uint8 smallBlindSeat = getNextActiveSeat(game, game.dealerSeat);
        uint8 bigBlindSeat = getNextActiveSeat(game, smallBlindSeat);
        if (activePlayers == 2) { // Heads-up play
            game.headsUp = true;
            smallBlindSeat = game.dealerSeat;
            bigBlindSeat = getNextActiveSeat(game, game.dealerSeat);
            game.actionOnSeat = bigBlindSeat;
        }
        createPot(game);
        postBlind(_gid, smallBlindSeat, game.bigBlind / 2);
        postBlind(_gid, bigBlindSeat, game.bigBlind);
        game.currentBet = game.bigBlind;
        game.lastActionBlock = block.number;
        game.lastActionTimestamp = block.timestamp;
        address[] memory playerAddresses = new address[](activePlayers);
        bytes32[] memory handPublicKeys = new bytes32[](activePlayers);
        uint8 count = 0;
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            uint8 seatIndex = (game.dealerSeat + i) % game.maxPlayers;
            if (game.players[seatIndex].addr == address(0) || game.players[seatIndex].handPublicKey == 0x0) continue;
            playerAddresses[count] = game.players[seatIndex].addr;
            handPublicKeys[count] = game.players[seatIndex].handPublicKey;
            count++;
        }
        game.hid = pokerDealer.createHand(_gid, playerAddresses, handPublicKeys);
        emit NewHand(_gid, game.hid, playerAddresses, handPublicKeys);
    }

    function playerAction(uint _gid, PlayerAction _action, uint _amount) external {
        Game storage game = games[_gid];
        Player storage currentPlayer = game.players[game.actionOnSeat];
        require(game.state != GameState.Waiting, "Game not started");
        require(currentPlayer.addr == msg.sender, "It's not your turn");
        require(!currentPlayer.hasFolded, "Already folded");

        if (_action == PlayerAction.Fold) {
            currentPlayer.hasFolded = true;
        } else if (_action == PlayerAction.Check) {
            require(currentPlayer.currentBet == game.currentBet, "Cannot check");
        } else if (_action == PlayerAction.Call) {
            uint callAmount = game.currentBet - currentPlayer.currentBet;
            uint actualCallAmount = (callAmount > currentPlayer.chips) ? currentPlayer.chips : callAmount;
            currentPlayer.chips -= actualCallAmount;
            currentPlayer.currentBet += actualCallAmount;
            addToPots(game, game.actionOnSeat, actualCallAmount, false);
        } else if (_action == PlayerAction.Raise) {
            require(_amount > game.currentBet, "Raise too small");
            uint amountRequired = _amount - currentPlayer.currentBet;
            require(amountRequired <= currentPlayer.chips, "Raise too high");
            currentPlayer.chips -= amountRequired;
            currentPlayer.currentBet += amountRequired;
            addToPots(game, game.actionOnSeat, amountRequired, false);
            game.currentBet = currentPlayer.currentBet;
            for (uint8 i = 0; i < game.maxPlayers; i++) game.players[i].hasActed = false;
        }
        pokerDealer.updateNextBlock(game.hid);
        currentPlayer.hasActed = true;
        emit Action(_gid, msg.sender, _action, _amount);
        if (allPlayersFolded(game) || playersAllIn(game)) {
            advanceToShowdown(_gid);
        } else {
            nextPlayer(_gid);
        }
    }

    function revealHand(uint _gid, bytes32 _privateKey, bytes32 _nextPublicKey) external {
        Game storage game = games[_gid];
        require(game.state == GameState.Showdown, "Not in showdown state");
        uint8 seat = getSeat(_gid, msg.sender);
        Player storage player = game.players[seat];
        player.handPrivateKey = _privateKey;
        require(keccak256(abi.encode(_privateKey)) == player.handPublicKey, "Keys don't match");
        player.handPublicKey = _nextPublicKey;
        game.lastActionTimestamp = block.timestamp;
        closeHand(_gid);
    }

    function closeHand(uint _gid) public {
        Game storage game = games[_gid];
        bytes32[] memory prePrivateKeys = new bytes32[](game.maxPlayers);
        bool ready = true;
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            Player storage eaplayer = game.players[i];
            if (eaplayer.addr != address(0) && eaplayer.hasFolded == false) {
                if (eaplayer.handPrivateKey != 0x0) {
                    prePrivateKeys[i] = eaplayer.handPrivateKey;
                } else {
                    ready = false;
                }
            }
        }
        if (ready) {
            // Remove empty seats from array
            uint8 activePlayers = getActivePlayers(game);
            bytes32[] memory handPrivateKeys = new bytes32[](activePlayers);
            uint8 found = 0;
            for (uint i = 0; i < prePrivateKeys.length; i++) {
                if (prePrivateKeys[i] != 0x0) {
                    handPrivateKeys[found] = prePrivateKeys[i];
                    found++;
                }
            }
            pokerDealer.close(game.hid, handPrivateKeys);
            findWinners(_gid);
        }
    }

    function foldAndLeave(uint _gid, uint8 _seat) internal {
        Game storage game = games[_gid];
        Player storage player = game.players[_seat];
        require(player.addr != address(0), "already left");
        player.hasFolded = true;
        player.hasActed = true;
        if (game.hid > 0) {
            pokerDealer.updateNextBlock(game.hid);
            emit Action(_gid, player.addr, PlayerAction.Fold, 0);
            if (game.actionOnSeat == _seat) {
                if (allPlayersFolded(game)) {
                    advanceToShowdown(_gid);
                    closeHand(_gid);
                } else {
                    nextPlayer(_gid);
                }
            }
        }
        removePlayerFromGame(_gid, _seat);
    }

    function removePlayerFromGame(uint _gid, uint8 _seat) internal {
        Game storage game = games[_gid];
        address payoutAddress = game.players[_seat].addr;
        uint payoutAmount = game.players[_seat].chips;
        delete game.players[_seat];
        pokerLobby.endGame(_gid, payoutAddress, payoutAmount);
    }

    function autoFold(uint _gid) external {
        Game storage game = games[_gid];
        require(game.state != GameState.Waiting, "Game not active");
        require(block.timestamp - game.lastActionTimestamp > 90, "AutoFold too soon"); // 90 seconds
        if (game.state == GameState.Showdown) {
             for (uint8 i = 0; i < game.maxPlayers; i++) {
                Player storage eaplayer = game.players[i];
                if (eaplayer.addr != address(0) && eaplayer.hasFolded == false) {
                    if (eaplayer.handPrivateKey == 0x0) {
                        foldAndLeave(_gid, i);
                    }
                }
            }
        } else {        
            foldAndLeave(_gid, game.actionOnSeat);
        }
    }

    function leaveGame(uint _gid) external {
        uint8 seat = getSeat(_gid, msg.sender);
        require(games[_gid].players[seat].addr == msg.sender, "Player not found");
        foldAndLeave(_gid, seat);
    }

    // Internal functions

    function addToPots(Game storage game, uint8 _seat, uint _amount, bool _blinds) internal {
        if (_blinds) {
            Pot storage pot = game.pots[0];
            pot.amount += _amount;
            pot.contributed[_seat] += _amount;
            game.potTotal += _amount;
            return;
        }
        uint remaining = _amount;
        for (uint i = 0; i < 8; i++) {
            Pot storage pot = game.pots[i];
            if (remaining + pot.contributed[_seat] <= pot.maxAmount) {
                pot.amount += remaining;
                pot.contributed[_seat] += remaining;
                game.potTotal += remaining;
                break;
            } else if (remaining > pot.maxAmount) {
                uint contribution = pot.maxAmount - pot.contributed[_seat];
                remaining -= contribution;
                pot.amount += contribution;
                pot.contributed[_seat] += contribution;
                game.potTotal += contribution;
                if (game.pots[i+1].maxAmount == 0) createPot(game);
            }
        }
    }

    function createPot(Game storage game) internal {
        uint8 nextEmptyPot = 0;
        for (uint8 i = 0; i < 8; i++) {
            if (game.pots[i].amount == 0) {
                nextEmptyPot = i;
                break;
            }
        }
        Pot storage pot = game.pots[nextEmptyPot];
        pot.maxAmount = game.bigBlind * 100;
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            Player storage player = game.players[i];
            uint pastPotContribution;
            for (uint8 j = 0; j < nextEmptyPot; j++) {
                Pot storage pastPot = game.pots[j];
                if (pastPot.contributed[i] < pastPot.maxAmount) pastPotContribution += (pastPot.maxAmount - pastPot.contributed[i]);
            }
            uint leftOver;
            if (player.chips > pastPotContribution) leftOver = player.chips - pastPotContribution;
            if (player.addr != address(0) && !player.hasFolded && leftOver > 0 && leftOver < pot.maxAmount) {
                pot.maxAmount = leftOver;
            }
        }
    }

    function getNextActiveSeat(Game storage game, uint8 _startSeat) internal view returns (uint8) {
        uint8 seat = _startSeat;
        do {
            seat = (seat + 1) % game.maxPlayers;
        } while (game.players[seat].addr == address(0) || game.players[seat].hasFolded || game.players[seat].chips == 0);
        return seat;
    }

    function allPlayersFolded(Game storage game) internal view returns (bool) {
        uint8 foldedPlayers = 0;
        uint8 activePlayers = getActivePlayers(game);
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            if (game.players[i].addr != address(0) && game.players[i].hasFolded) {
                foldedPlayers++;
            }
        }
        return (foldedPlayers == activePlayers - 1);
    }

    function playersAllIn(Game storage game) internal view returns (bool) {
        uint8 allInPlayers;
        uint8 stillIn;
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            Player storage player = game.players[i];
            if (player.addr != address(0) && !player.hasFolded) {
                stillIn++;
                if (player.chips == 0) {
                    allInPlayers++;
                } else if (!player.hasActed) {
                    return false;
                }
            }
        }
        return (allInPlayers >= stillIn - 1);
    }

    function getActivePlayers(Game storage game) internal view returns (uint8) {
        uint8 inTheGame = 0;
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            if (game.players[i].addr != address(0)) {
                inTheGame++;
            }
        }
        return inTheGame;
    }

    function isRoundComplete(Game storage game) internal view returns (bool) {
        uint8 playersToAct = 0;
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            Player storage player = game.players[i];
            if (player.addr != address(0) && !player.hasFolded && player.chips > 0) {
                if (!player.hasActed || player.currentBet != game.currentBet) {
                    playersToAct++;
                }
            }
        }
        return playersToAct == 0;
    }

    function resetBets(Game storage game) internal {
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            Player storage player = game.players[i];
            if (player.addr != address(0) && !player.hasFolded && player.chips > 0) {
                player.currentBet = 0;
                player.hasActed = false;
            }
        }
        game.currentBet = 0;
    }

    function resetGame(uint _gid) internal {
        Game storage game = games[_gid];
        game.state = GameState.Waiting;
        delete game.pots;
        game.currentBet = 0;
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            Player storage player = game.players[i];
            if (player.addr != address(0)) {
                player.currentBet = 0;
                player.hasFolded = false;
                player.hasActed = false;
                player.handPrivateKey = 0x0;
                if (player.chips < game.bigBlind) removePlayerFromGame(_gid, i);
            }
        }
    }

    function postBlind(uint _gid, uint8 _seat, uint _blindAmount) internal {
        Game storage game = games[_gid];
        Player storage player = game.players[_seat];
        if (player.chips < _blindAmount) {
            removePlayerFromGame(_gid, _seat);
        }
        player.chips -= _blindAmount;
        player.currentBet = _blindAmount;
        addToPots(game, _seat, _blindAmount, true);
    }

    function nextPlayer(uint _gid) internal {
        Game storage game = games[_gid];
        require(game.state != GameState.Waiting, "Game hasn't started yet");
        do {
            game.actionOnSeat = getNextActiveSeat(game, game.actionOnSeat);
        } while (game.players[game.actionOnSeat].hasFolded);
        if (isRoundComplete(game)) {
            advanceToNextRound(_gid);
        }
        game.lastActionBlock = block.number;
        game.lastActionTimestamp = block.timestamp;
    }

    function advanceToNextRound(uint _gid) internal {
        Game storage game = games[_gid];
        if (allPlayersFolded(game) || playersAllIn(game)) {
            advanceToShowdown(_gid);
        } else {
            if (game.state == GameState.PreFlop) {
                game.state = GameState.Flop;
                pokerDealer.flop(game.hid);
            } else if (game.state == GameState.Flop) {
                game.state = GameState.Turn;
                pokerDealer.turn(game.hid);
            } else if (game.state == GameState.Turn) {
                game.state = GameState.River;
                pokerDealer.river(game.hid);
            } else if (game.state == GameState.River) {
                game.state = GameState.Showdown;
                return;
            }
            resetBets(game);
            game.actionOnSeat = getNextActiveSeat(game, game.dealerSeat);
            if (game.headsUp == true && 
                (game.state == GameState.Flop || 
                game.state == GameState.Turn || 
                game.state == GameState.River)
            ) {
                game.actionOnSeat = game.dealerSeat; // heads up play
            }
            emit NewRound(_gid, game.state);
        }
    }

    function advanceToShowdown(uint _gid) internal {
        Game storage game = games[_gid];
        while (game.state != GameState.River) {
            if (game.state == GameState.PreFlop) {
                game.state = GameState.Flop;
                pokerDealer.flop(game.hid);
            } else if (game.state == GameState.Flop) {
                game.state = GameState.Turn;
                pokerDealer.turn(game.hid);
            } else if (game.state == GameState.Turn) {
                game.state = GameState.River;
                pokerDealer.river(game.hid);
            }
            emit NewRound(_gid, game.state);
        }
        game.state = GameState.Showdown;
        emit NewRound(_gid, game.state);
    }

    function findWinners(uint _gid) internal {
        Game storage game = games[_gid];
        for (uint potIndex = 0; potIndex < 8; potIndex++) {
            Pot storage pot = game.pots[potIndex];
            if (pot.amount == 0) break;
            uint8[7][9] memory hands;
            for (uint8 i = 0; i < 9; i++) {
                Player storage player = game.players[i];
                if (player.addr != address(0) && !player.hasFolded && pot.contributed[i] > 0) {
                    hands[i] = pokerDealer.getCards(game.hid, player.handPrivateKey);
                }
            }            
            bool[9] memory winners = handEvaluator.determineWinners(hands);
            uint8 winnerCount;
            for (uint8 i = 0; i < 9; i++) {
                if (winners[i] == true) winnerCount += 1;
            }
            uint winnerShare = pot.amount / winnerCount;
            for (uint8 i = 0; i < 9; i++) {
                if (winners[i] == true && game.players[i].addr != address(0)) {
                    game.players[i].chips += winnerShare;
                    emit Winner(_gid, game.hid, game.players[i].addr, winnerShare);
                }
            }
        }
        resetGame(_gid);
    }

    // Public View functions
    
    function getSeat(uint _gid, address _player) public view returns (uint8) {
        uint8 seat;
        for (uint8 i = 0; i < games[_gid].maxPlayers; i++) {
            if (games[_gid].players[i].addr == _player) seat = i;
        }
        return seat;
    }

    function getPlayer(uint _gid, uint8 _seat) public view returns (Player memory) {
        return games[_gid].players[_seat];
    }

/*
    function getCommunityCards(uint _hid) public view returns (uint8[5] memory) {
        (uint8 flop1, uint8 flop2, uint8 flop3) = pokerDealer.getFlop(_hid);
        uint8 turn = pokerDealer.getTurn(_hid);
        uint8 river = pokerDealer.getRiver(_hid);
        return [flop1, flop2, flop3, turn, river];
    }

*/
}