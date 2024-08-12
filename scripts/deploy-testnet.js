require("@nomicfoundation/hardhat-verify");

async function main() {
    const [deployer] = await ethers.getSigners();

    const network = await ethers.provider.getNetwork();
    if (network.chainId !== 11155111n && network.chainId !== 84532n) {
      console.error("This script should only be run on the Sepolia network!", network.chainId);
      process.exit(1);
    }

    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy PokerChips contract
    const PokerChips = await ethers.getContractFactory("PokerChips");
    const pokerChips = await PokerChips.deploy();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log("PokerChips deployed to:", await pokerChips.getAddress());

    // Deploy PokerHandEvaluator contract
    const HandEvaluator = await ethers.getContractFactory("PokerHandEvaluator");
    const handEvaluator = await HandEvaluator.deploy();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log("PokerHandEvaluator deployed to:", await handEvaluator.getAddress());

    // Deploy PokerDealer contract
    const PokerDealer = await ethers.getContractFactory("PokerDealer");
    const pokerDealer = await PokerDealer.deploy();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log("PokerDealer deployed to:", await pokerDealer.getAddress());

    const PokerLobby = await ethers.getContractFactory("PokerLobby");
    const pokerLobby = await PokerLobby.deploy();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log("PokerLobby deployed to:", await pokerLobby.getAddress());

    // Deploy PokerGame contract
    const PokerGame = await ethers.getContractFactory("PokerGame");
    const pokerGame = await PokerGame.deploy(
      await handEvaluator.getAddress(),
      await pokerDealer.getAddress(),
      await pokerLobby.getAddress(),
    );

    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log("PokerGame deployed to:", await pokerGame.getAddress());

    // Set PokerGame address in PokerLobby
    await pokerLobby.setPokerGameAddress(await pokerGame.getAddress());
    console.log("Set PokerGame address in PokerLobby");

    console.log("Waiting for a few minutes before verifying the contracts...");
    await new Promise((resolve) => setTimeout(resolve, 180000)); // 3 minute delay

    // Verify contracts on Etherscan
    await verifyContract(await handEvaluator.getAddress(), []);
    await verifyContract(await pokerChips.getAddress(), []);
    await verifyContract(await pokerDealer.getAddress(), []);
    await verifyContract(await pokerLobby.getAddress(), []);
    await verifyContract(await pokerGame.getAddress(), [await handEvaluator.getAddress(), await pokerDealer.getAddress(), await pokerLobby.getAddress()]);

    // Show me the money
    await pokerChips.mint(100000e6);
    await pokerChips.approve(await pokerLobby.getAddress(), 100000e6);
}

async function verifyContract(address, constructorArguments) {
    try {
      await hre.run("verify:verify", {
          address: address,
          constructorArguments: constructorArguments,
      });
      console.log(`Contract at ${address} verified`);
    } catch (error) {
      console.error(`Error verifying contract at ${address}:`, error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });