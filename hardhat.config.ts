import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-ethers";

dotenv.config();



task("swap", "swap token")
  .addParam("contractAddress", "The bridge contract address on ETH")
  .addParam("tokenAddress", "Token contract address")
  .addParam("to", "address to")
  .addParam("amount", "amount")
  .addParam("chainid", "tochainid")
  .setAction(async (taskArgs, hre) => {
    const contract = await hre.ethers.getContractAt("BridgeEmv", taskArgs.contractAddress)
    await contract.swap(taskArgs.tokenAddress, taskArgs.to, taskArgs.amount, taskArgs.chainid);
  });

task("reedem", "mint token")
  .addParam("contractAddress", "The bridge contract address on BSC")
  .addParam("tokenAddress", "Token contract address")
  .addParam("to", "to")
  .addParam("amount", "amount")
  .addParam("nonce", "nonce")
  .addParam("r", "r")
  .addParam("s", "s")
  .addParam("v", "v")
  .setAction(async (taskArgs, hre) => {
    const contract = await hre.ethers.getContractAt("BridgeEmv", taskArgs.contractAddress)
    await contract.redeem(
      taskArgs.tokenAddress,
      taskArgs.to,
      taskArgs.amount,
      taskArgs.nonce,
      taskArgs.r,
      taskArgs.s,
      taskArgs.v
    );
  });

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts:
        process.env.RINKEBY_PRIVATE_KEY !== undefined ? [process.env.RINKEBY_PRIVATE_KEY] : [],
    },
    hardhat: {
      initialBaseFeePerGas: 0
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts:
        process.env.RINKEBY_PRIVATE_KEY !== undefined ? [process.env.RINKEBY_PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      rinkeby: process.env.ETHERSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY,
    },
  },
};

export default config;
