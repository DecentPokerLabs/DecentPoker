// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PokerDealer
 * @author decentpokerlabs@proton.me
 * @notice Trustless Dealing System
 *   ____                      _   ____       _             
 *  |  _ \  ___  ___ ___ _ __ | |_|  _ \ ___ | | _____ _ __ 
 *  | | | |/ _ \/ __/ _ \ '_ \| __| |_| / _ \| |/ / _ \  __|
 *  | |_| |  __/ |_|  __/ | | | |_|  __/ |_| |   <  __/ |   
 *  |____/ \___|\___\___|_| |_|\__|_|   \___/|_|\_\___|_|   
 *                                                          
 *       The Open Decentralized Poker Project               
 *            https://decentpoker.org                       
 */

import "hardhat/console.sol";

contract PokerDealer {

    struct Hand {
        address dealer;
        uint gid;
        uint blockNumber;
        address[] players;
        bytes32[] privateKeys;
        bytes32[] publicKeys;
        bytes32 playersHash;
        uint8[52] shuffleDeck;
        uint8[] card1;
        uint8[] card2;
        uint8 flop1;
        uint8 flop2;
        uint8 flop3;
        uint8 turn;
        uint8 river;
        bool verified;
    }

    mapping(uint => Hand) public hands;
    uint public handCount;
    address public evaluator;
    uint8 nullCard = 0;

    event HandCreated(uint indexed gid, uint indexed hid, address[] players, bytes32[] publicKeys);
    event Flop(uint indexed gid, uint indexed hid, uint8 flop1, uint8 flop2, uint8 flop3);
    event Turn(uint indexed gid, uint indexed hid, uint8 turn);
    event River(uint indexed gid, uint indexed hid, uint8 river);
    event HandClosed(uint indexed gid, uint indexed hid, bytes32[] privateKeys, bool valid);

    function shuffle(uint8[52] memory _deck, bytes32 _blockHash, bytes32 _privateKey) public pure returns (uint8[52] memory) {
        bytes32 combinedHash = keccak256(abi.encodePacked(_blockHash, _privateKey));
        uint8[52] memory shuffledDeck = _deck;
        for (uint i = 0; i < shuffledDeck.length; i++) {
            uint randomIndex = uint(keccak256(abi.encodePacked(combinedHash, i))) % shuffledDeck.length;
            uint8 temp = shuffledDeck[i];
            shuffledDeck[i] = shuffledDeck[randomIndex];
            shuffledDeck[randomIndex] = temp;
        }
        return shuffledDeck;
    }

    function nextCard(uint _hid) internal returns (uint8) {
        uint8 card;
        uint8 i = 0;
        bool found = false;
        while (i < hands[_hid].shuffleDeck.length) {
            card = hands[_hid].shuffleDeck[i];
            if (card != 0) {
                hands[_hid].shuffleDeck[i] = 0; // mark card as taken
                found = true;
                break;
            }
            i++;
        }
        require(found, "No cards left in the deck");
        return card;
    }

    function createHand(uint _gid, address[] memory _players, bytes32[] memory _publicKeys) public returns (uint) {
        require(_players.length >= 2, "Increase players");
        require(_players.length == _publicKeys.length, "Player, keys mismatch");
        handCount++;
        Hand storage newHand = hands[handCount];
        newHand.gid = _gid;
        newHand.dealer = msg.sender;
        newHand.players = _players;
        newHand.blockNumber = block.number + 1;
        newHand.playersHash = keccak256(abi.encode(_publicKeys));
        for (uint8 i = 0; i < 52; i++) newHand.shuffleDeck[i] = i + 1;

        for (uint i = 0; i < _players.length; i++) {
            uint8 seen;
            for (uint i2 = 0; i2 < _players.length; i2++) {
                if (_players[i] == _players[i2]) seen++;
            }
            require(seen == 1, "One entry per address");
            require(_publicKeys[i] != 0x0, "Invalid public key");
            newHand.publicKeys.push(_publicKeys[i]);
        }
        emit HandCreated(_gid, handCount, _players, _publicKeys);
        return handCount;
    }

    function updateNextBlock(uint _hid) external {
        Hand storage hand = hands[_hid];
        require(hand.dealer != address(0), "Hand does not exist");
        require(msg.sender == hand.dealer, "Only dealer can flop");
        hand.blockNumber = block.number + 1;
    }

    function flop(uint _hid) public {
        Hand storage hand = hands[_hid];
        require(hand.dealer != address(0), "Hand does not exist");
        require(msg.sender == hand.dealer, "Only dealer can draw flop");
        hand.shuffleDeck = shuffle(hand.shuffleDeck, blockhash(hand.blockNumber), hand.playersHash);
        hand.flop1 = nextCard(_hid);
        hand.flop2 = nextCard(_hid);
        hand.flop3 = nextCard(_hid);
        emit Flop(hand.gid, _hid, hand.flop1, hand.flop2, hand.flop3);
    }

    function turn(uint _hid) public {
        Hand storage hand = hands[_hid];
        require(hand.dealer != address(0), "Hand does not exist");
        require(msg.sender == hand.dealer, "Only dealer can draw turn");
        hand.shuffleDeck = shuffle(hand.shuffleDeck, blockhash(hand.blockNumber), hand.playersHash);
        hand.turn = nextCard(_hid);
        emit Turn(hand.gid, _hid, hand.turn);
    }

    function river(uint _hid) public {
        Hand storage hand = hands[_hid];
        require(hand.dealer != address(0), "Hand does not exist");
        require(msg.sender == hand.dealer, "Only dealer can draw river");
        hand.shuffleDeck = shuffle(hand.shuffleDeck, blockhash(hand.blockNumber), hand.playersHash);
        hand.river = nextCard(_hid);
        emit River(hand.gid, _hid, hand.river);
    }

    function deal(uint _hid, bytes32 _privateKey) public view returns (uint8, uint8) {
        // Calculate locally, example in unit tests
        Hand storage hand = hands[_hid];
        uint8[52] memory deck;
        for (uint8 i = 0; i < 52; i++) deck[i] = i + 1;
        uint8[52] memory shuffledDeck = shuffle(deck, blockhash(hand.blockNumber), _privateKey);
        return (shuffledDeck[0], shuffledDeck[1]);
    }

    function verify(uint _hid, bytes32[] memory _privateKeys) public view returns (bool) {
        Hand storage hand = hands[_hid];
        bytes32[] memory publicKeys = new bytes32[](_privateKeys.length);
        bool valid = true;
        for (uint i = 0; i < _privateKeys.length; i++) {
            publicKeys[i] = keccak256(abi.encode(_privateKeys[i]));
            if (hand.publicKeys[i] != publicKeys[i]) valid = false;
        }
        if (hand.playersHash != keccak256(abi.encode(publicKeys))) valid = false;
        return valid;
    }

    function close(uint _hid, bytes32[] memory _privateKeys) public returns (bool) {
        bool valid = verify(_hid, _privateKeys);
        emit HandClosed(hands[_hid].gid, _hid, _privateKeys, valid);
        return valid;
    }

    function getPlayersInHand(uint _hid) public view returns (address[] memory) {
        return hands[_hid].players;
    }

    function getHand(uint _hid) public view returns (Hand memory) {
        return (hands[_hid]);
    }

    function getFlop(uint _hid) public view returns (uint8, uint8, uint8) {
        return (hands[_hid].flop1, hands[_hid].flop2, hands[_hid].flop3);
    }

    function getTurn(uint _hid) public view returns (uint8) {
        return hands[_hid].turn;
    }

    function getRiver(uint _hid) public view returns (uint8) {
        return hands[_hid].river;
    }

    function getHash(uint _hid) public view returns (bytes32) {
        return blockhash(hands[_hid].blockNumber);
    }

    function getCards(uint _hid, bytes32 _privateKey) public view returns (uint8[7] memory) {
        (uint8 card1, uint8 card2) = deal(_hid, _privateKey);
        Hand storage hand = hands[_hid];
        return ([card1, card2, hand.flop1, hand.flop2, hand.flop3, hand.turn, hand.river]);
    }
}
