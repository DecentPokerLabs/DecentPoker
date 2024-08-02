# DecentPoker
#### The Open Decentralized Poker Project

## Table of Contents
- [Introduction](#introduction)
- [Project Overview](#project-overview)
- [Project Structure](#project-structure)
  - [Smart Contracts](#smart-contracts)
  - [Frontend](#frontend)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Challenges and Solutions](#challenges-and-solutions)
- [Contributing](#contributing)
- [Legal Disclaimer](#legal-disclaimer)
- [Resources and Links](#resources-and-links)

## Introduction

The goal is to create the first fully decentralized peer-to-peer poker game using EVM smart contracts and cryptography. This project aims to ensure fairness and security in online poker through blockchain technology. To the best of our knowledge all "decentralized poker" games previously released have relied on some form of centralized dealer which detracts from the value in a trustless platform.

There are [challenges and compromises](#challenges-and-solutions) required to make this work but the code here proves it is possible.

## Project Overview

A decentralized poker game is a technically challenging project due to the computational constraints of Web3 backends and the complexity of dealing cards privately in a trustless, permissionless environment. The solution leverages the transparency of blockchain while maintaining the necessary privacy for a fair poker game.

## Project Structure

### Smart Contracts

1. **PokerHandEvaluator.sol**
   - Compares poker hands to determine a winner
   - Evaluates hand strength and ranks hands
   - Tested against more than 1 million hands

2. **PokerChips.sol**
   - Implements an ERC20 token for in-game poker chips
   - Handles 1:1 deposits and withdrawals with USDC
   - Both PokerChips and USDC use 6 decimal places

3. **PokerDealer.sol**
   - Manages random, private card distribution
   - Ensures on-chain verifiability of card dealing
   - Implements a solution for trustless card dealing (see [Challenges and Solutions](#challenges-and-solutions))

4. **PokerGame.sol**
   - Contains core game logic (betting rounds, blinds, dealer rotation)
   - Manages game flow and rule enforcement
   - Handles split pots and side pots
   - Implements timeouts for unresponsive players
   - Emits events to update the frontend with user actions

### Frontend

- **dApp Client** (In Development)
  - Will provide a user friendly interface for the game
  - Utilize account abstraction and latest web3 UX practices
  - Create a seamless onboarding process

### Testnet

Deployed to Ethereum Sepolia testnet

MockUSDC deployed to:
0x180E80d218878Ba569Ca3463661E157Dc47d016F

PokerChips deployed to:
0x14bb1E229725be421e397443dF7b74ffc433C52c

PokerHandEvaluator deployed to:
0x1D1ed5505c2b401edC44F436712577489D1B670D

PokerDealer deployed to:
0xF20EFa959474eAcDA038a735b5b2bF052E0d0979

PokerGame deployed to:
0xbeCbC2bA2afB8c69D00DaA9d860366bb539F0919

Before playing the game on testnet you'll need to mint and approve some tokens.
   await usdc.mint(deployer.address, 1000e6);
   await usdc.approve(await pokerChips.getAddress(), 1000e6);
   await pokerChips.depositUSDC(1000e6);
   await pokerChips.approve(await pokerGame.getAddress(), 1000e6);

## Getting Started

To set up the ODP project locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/open-decentralized-poker.git
   cd open-decentralized-poker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the smart contracts:
   ```bash
   npx hardhat compile
   ```

## Testing

Run the test suite to ensure all contracts function as expected:

```bash
npx hardhat test
```

We encourage contributors to add more tests and submit pull requests to improve code coverage and reliability.

## Challenges and Solutions

There are two main challenges to creating a on-chain poker application. The first is the limited computational and storage capabilities of decentralized web3 infrastructure. This restricts the amount of data you can store in hands but also limits code size of the contracts to 24576 bytes. PokerGame.sol in particular is right on the limit of stack too deep and code too large errors which has led to optimisation at the cost of readability.

The main challenge however is dealing cards privately while ensuring fairness. We've explored several solutions:

1. **Third-party Dealer (Oracle)**
   - Pros: Simpler implementation
   - Cons: Relies on a trusted third party
   - Demo in scripts/dealer.js and dealer-client.js

2. **Player-generated Randomness**
   - Example implementation in `mocks/PokerDealerV2.sol`
   - Uses a combination of player-generated keys and future block hashes
   - Pros: Fully decentralized, trustless and permissionless
   - Cons: Potential for duplicate hole cards and 6 of a kind, collusion could cause issues

3. **PlayersHash + Next Block Hash**
   - Current implementation in `mocks/PokerDealer.sol`
   - All parties submit a unique public key for each hand
   - When all parties are finished acting we record the block number
   - Players can calculate their hole cards privately using private key and next block hash
   - Community cards use hashes with a hash of the block after last action for randomness
   - Private keys are submitted at the close to verify hole cards

4. **Alternative Solutions**
   - Open to suggestions for improving the card dealing mechanism

## Additional Challenges

While decentralization offers numerous benefits, it also introduces specific challenges that must be addressed to ensure a fair and enjoyable poker experience.

### Lack of Central Authority

In a decentralized poker game, there is no central authority to oversee and police the game. This absence of regulation can lead to several issues, the most significant being collusion.

#### Collusion

Collusion occurs when two or more players conspire to gain an unfair advantage over others. This can involve sharing information about their hands, coordinating betting strategies, or other forms of cheating. Without a central authority to monitor and enforce fair play, collusion becomes a serious concern in decentralized environments.

#### Poker Bots

Another challenge is the potential for poker bots. Automated programs can be designed to play perfectly or near perfectly, providing an unfair advantage over human players. This undermines the integrity of the game and can deter human players from participating.


**Mitigation Strategies:**

1. **Reputation Systems:** Develop a reputation system where players can create some form of social graph of the players they know and/or can rate each other. Could link to existing social graphs in a similar way to @Friend.tech did with X/Twitter. This would all need to be done as a separate frontend system and would be separate from the underlying contract code.

2. **Statistical Analysis:** Use algorithms to analyze game patterns and detect unusual betting that may indicate collusion or bots, flag these users on the frontend to warn other players. Again could only be implimented at a frontend level.

3. **Home Games:** Encourage users to setup home games with their friends using a private code which allows access. This way they can ensure they are playing against the people they know and trust... on a trustless platform. 

No one wants to play poker against a network of AI bots colluding and playing game optimal strategies to extract your funds. At the same time we are creating a decentralized poker game to avoid any party being able to ban another party. It's a complex problem which will likely be an ongoing battle if the project is successful.

## Contributing

We welcome contributions to the project! Here's how you can help:

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Commit your changes and push to your fork
4. Submit a pull request with a clear description of your changes

Please ensure your code includes appropriate tests and speak to the core devs first before undertaking any significant work to assure it's something we can merge.

## Legal Disclaimer

This software is intended for educational and experimental purposes only. The use of this software for real money gambling may be illegal in your jurisdiction. Users are solely responsible for ensuring compliance with all applicable local laws and regulations. This software is provided "as is" without any warranties. The developers and contributors shall not be held liable for any damages or litigation arising from its use. By using this software, you acknowledge that you understand and accept these terms.
