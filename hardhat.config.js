require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.21", settings: { evmVersion: 'paris'} },
      { version: "0.7.6" },
      { version: "0.6.6" }
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  networks: {
    local: {
      url: 'http://127.0.0.1:8545',
    },
    sepolia: {
      url: 'https://eth-sepolia.g.alchemy.com/v2/'+process.env.ALCHEMY_API_KEY,
      accounts: [process.env.PRIVATE_KEY],
    },
    baseSepolia: {
      url: 'https://sepolia.base.org',
      accounts: [process.env.PRIVATE_KEY],
    },
    mainnet: {
      url: 'https://eth-mainnet.alchemyapi.io/v2/'+process.env.ALCHEMY_API_KEY,
      accounts: [process.env.USER1_PRIVATE_KEY,process.env.USER2_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      "mainnet": process.env.ETHERSCAN_API_KEY,
      "sepolia": process.env.ETHERSCAN_API_KEY,
      "baseSepolia": process.env.BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org/'
        }
      }
    ],
  },
  sourcify: {
    enabled: true
  },
  mocha: {
    timeout: 100000000
  },
};
