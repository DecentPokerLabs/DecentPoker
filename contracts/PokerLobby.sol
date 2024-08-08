// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import 'hardhat/console.sol';

/**
 * @title PokerLobby
 * @author decentpokerlabs@proton.me
 * @notice Poker cash and sit & go tournament games
 *   ____                      _   ____       _             
 *  |  _ \  ___  ___ ___ _ __ | |_|  _ \ ___ | | _____ _ __ 
 *  | | | |/ _ \/ __/ _ \ '_ \| __| |_| / _ \| |/ / _ \  __|
 *  | |_| |  __/ |_|  __/ | | | |_|  __/ |_| |   <  __/ |   
 *  |____/ \___|\___\___|_| |_|\__|_|   \___/|_|\_\___|_|   
 *                                                          
 *       The Open Decentralized Poker Project               
 *            https://decentpoker.org                       
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IPokerGame {
    function createGame(uint8 _maxPlayers, uint _bigBlind) external returns (uint);
    function joinGame(uint _gid, address _player, uint8 _seat, bytes32 _handPublicKey) external;
    function updateBlinds(uint _gid, uint _bigBlind) external;
}

contract PokerLobby {

    IPokerGame public pokerGame;

    struct CashGame {
        uint gid;
        uint8 maxPlayers;
        uint bigBlind;
        bytes32 invitePublicKey;
        uint startTimestamp;
        address token;
    }

    struct SitAndGo {
        uint gid;
        uint8 maxPlayers;
        uint bigBlind;
        uint blindDuration;
        uint lastBlindUpdate;
        uint startingChips;
        bytes32 invitePublicKey;
        uint startTimestamp;
        uint buyIn;
        address token;
        address[9] players;
        bytes32[9] handPublicKeys;
        address[9] position;
    }

    mapping(uint => CashGame) public cashGames;
    mapping(uint => SitAndGo) public sitAndGos;

    event CashGameCreated(uint indexed gid, uint8 maxPlayers, uint bigBlind, address token);
    event SitAndGoCreated(uint indexed gid, uint8 maxPlayers, uint bigBlind, uint buyIn, address token);
    event JoinCashGame(uint indexed gid, address indexed player, uint8 seat);
    event RegisterSitAndGo(uint indexed gid, address indexed player, uint8 seat);
    event SitAndGoStarted(uint indexed gid, uint startTimestamp);
    event BlindsUpdated(uint indexed gid, uint newBigBlind);
    event GameEnded(uint indexed gid, address indexed player, uint chips);

    function setPokerGameAddress(address _pokerGame) external {
        require(address(pokerGame) == address(0), "Poker game already set");
        pokerGame = IPokerGame(_pokerGame);
    }

    function createCashGame(
        uint8 _maxPlayers,
        uint _bigBlind,
        bytes32 _invitePublicKey,
        address _token
    ) external returns (uint) {
        uint gid = pokerGame.createGame(_maxPlayers, _bigBlind);
        CashGame storage game = cashGames[gid];
        game.gid = gid;
        game.maxPlayers = _maxPlayers;
        game.bigBlind = _bigBlind;
        game.invitePublicKey = _invitePublicKey;
        game.startTimestamp = block.timestamp;
        game.token = _token;
        emit CashGameCreated(gid, _maxPlayers, _bigBlind, _token);
        return gid;
    }

    function createSitAndGo(
        uint8 _maxPlayers,
        uint _bigBlind,
        uint _blindDuration,
        uint _startingChips,
        bytes32 _invitePublicKey,
        uint _buyIn,
        address _token
    ) external returns (uint) {
        uint gid = pokerGame.createGame(_maxPlayers, _bigBlind);
        SitAndGo storage game = sitAndGos[gid];
        game.gid = gid;
        game.maxPlayers = _maxPlayers;
        game.bigBlind = _bigBlind;
        game.blindDuration = _blindDuration;
        game.startingChips = _startingChips;
        game.invitePublicKey = _invitePublicKey;
        game.buyIn = _buyIn;
        game.token = _token;
        emit SitAndGoCreated(gid, _maxPlayers, _bigBlind, _buyIn, _token);
        return gid;
    }

    function joinCashGame(uint _gid, uint8 _seat, bytes32 _handPublicKey, bytes32 _invitePrivateKey) external {
        CashGame storage game = cashGames[_gid];
        require(game.bigBlind > 0, "Game not found");
        require(keccak256(abi.encodePacked(_invitePrivateKey)) == game.invitePublicKey || game.invitePublicKey == 0x0, "invitePrivateKey invalid");
        uint buyIn = game.bigBlind * 100;
        IERC20(game.token).transferFrom(msg.sender, address(this), buyIn);
        pokerGame.joinGame(_gid, msg.sender, _seat, _handPublicKey);
        emit JoinCashGame(_gid, msg.sender, _seat);
    }

    function registerSitAndGo(uint _gid, uint8 _seat, bytes32 _handPublicKey, bytes32 _invitePrivateKey) external {
        SitAndGo storage game = sitAndGos[_gid];
        require(game.bigBlind > 0, "Game not found");
        require(game.players[_seat] == address(0), "Seat taken forrest");
        require(keccak256(abi.encodePacked(_invitePrivateKey)) == game.invitePublicKey || game.invitePublicKey == 0x0, "invitePrivateKey invalid");
        IERC20(game.token).transferFrom(msg.sender, address(this), game.buyIn);
        emit RegisterSitAndGo(_gid, msg.sender, _seat);
        game.players[_seat] = msg.sender;
        game.handPublicKeys[_seat] = _handPublicKey;
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            if (game.players[i] == address(0)) return;
        }
        startSitAndGo(game);
    }

    function startSitAndGo(SitAndGo storage game) internal {
        game.startTimestamp = block.timestamp;
        game.lastBlindUpdate = block.timestamp;
        for (uint8 i = 0; i < game.maxPlayers; i++) {
            pokerGame.joinGame(game.gid, game.players[i], i, game.handPublicKeys[i]);
        }
        emit SitAndGoStarted(game.gid, game.startTimestamp);
    }

    function findNextBlind(uint _currentBigBlind) public pure returns (uint) {
        uint16[10] memory fixedBlinds = [20,30,50,100,150,200,300,400,600,1000];
        for (uint i = 0; i < fixedBlinds.length -1; i++) {
            if (_currentBigBlind == fixedBlinds[i]) return fixedBlinds[i+1];
        }
        uint increasedBlind = _currentBigBlind * 14 / 10;
        // Log base 10
        uint exponent = 0;
        uint tmpBlind = increasedBlind;
        while (tmpBlind >= 10) {
            tmpBlind /= 10;
            exponent += 1;
        }
        uint significantPart = increasedBlind / (10 ** exponent);
        if (significantPart <= 1) {
            significantPart = 1;
        } else if (significantPart <= 2) {
            significantPart = 2;
        } else if (significantPart <= 5) {
            significantPart = 5;
        } else {
            significantPart = 10;
        }
        uint newBlind = significantPart * (10 ** exponent);
        if (newBlind == _currentBigBlind) newBlind = newBlind * 15 / 10;
        return newBlind;
    }

    function updateBlinds(uint _gid) external {
        SitAndGo storage game = sitAndGos[_gid];
        require(game.lastBlindUpdate != 0, "Game not started");
        require (block.timestamp > game.lastBlindUpdate + game.blindDuration, "Cant update blinds yet");
        game.bigBlind = findNextBlind(game.bigBlind);
        game.lastBlindUpdate = block.timestamp;
        pokerGame.updateBlinds(_gid, game.bigBlind);
        emit BlindsUpdated(_gid, game.bigBlind);
    }

    function endGame(uint _gid, address _player, uint _chips) external {
        require(msg.sender == address(pokerGame), "only pokerGame can endGame");
        if (cashGames[_gid].bigBlind > 0) {
            IERC20(cashGames[_gid].token).transfer(_player, _chips);
            emit GameEnded(_gid, _player, _chips);
        } else if (sitAndGos[_gid].bigBlind > 0) {
            SitAndGo storage game = sitAndGos[_gid];
            for (uint i = 0; i < game.maxPlayers; i++) {
                require(game.position[i] != _player, "Already ended game");
                if (game.position[i] == address(0)) {
                    game.position[i] = _player;
                    if (i != game.maxPlayers -1) break;
                }
                uint prizePool = game.buyIn * game.maxPlayers;
                if (i == game.maxPlayers -1 && game.maxPlayers == 9) {
                    uint firstPlace = prizePool / 2;  // 50%, 30%, 20% split
                    uint secondPlace = prizePool * 3 / 10;
                    uint thirdPlace = prizePool - secondPlace - firstPlace;
                    IERC20(game.token).transfer(game.position[8], firstPlace);
                    IERC20(game.token).transfer(game.position[7], secondPlace);
                    IERC20(game.token).transfer(game.position[6], thirdPlace);
                } else if (i == game.maxPlayers -1 && game.maxPlayers >= 6) {
                    uint firstPlace = prizePool * 65 / 100; // 65%, 35% split
                    uint secondPlace = prizePool - firstPlace;
                    IERC20(game.token).transfer(game.position[game.maxPlayers - 1], firstPlace);
                    IERC20(game.token).transfer(game.position[game.maxPlayers - 2], secondPlace);
                } else if (i == game.maxPlayers -1) {
                    IERC20(game.token).transfer(game.position[game.maxPlayers - 1], prizePool);
                }
            }
            emit GameEnded(_gid, _player, _chips);
        }
    }
}
