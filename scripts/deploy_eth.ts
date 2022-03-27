
import { ethers } from "hardhat";
async function main() {
  /*
  npx hardhat run--network rinkeby  scripts / deploy_eth.ts
  No need to generate any newer typings.
  Token deployed to: 0x5BA5DA98D00bDd22B81FA2f40741632f9437b9E2
  Минтим токены пользователю: 0xC263718b809ab3EF9C816d7A2313ef0CA0Bb58a1
  bridgeEmv deployed to: 0x2FB449aE63Dde2B2B71eF071525Db559B842327a
  Выдаем роль BRIDGE_ROLE мосту для управления токенами

  Верифицируем контракт токенов
  npx hardhat verify --network rinkeby  0x5BA5DA98D00bDd22B81FA2f40741632f9437b9E2  "MyTokenForBridge" "MTK"
  https://rinkeby.etherscan.io/address/0x5ba5da98d00bdd22b81fa2f40741632f9437b9e2

   Верифицируем контракт моста
  npx hardhat verify --network rinkeby 0x2FB449aE63Dde2B2B71eF071525Db559B842327a 3 0xC263718b809ab3EF9C816d7A2313ef0CA0Bb58a1
  https://rinkeby.etherscan.io/address/0x2fb449ae63dde2b2b71ef071525db559b842327a

    */
  const VALIDATOR_ADDRESS = "0xC263718b809ab3EF9C816d7A2313ef0CA0Bb58a1";
  const CHAIN_ID = 3;
  let UserMintToken = ethers.utils.parseEther("1000");

  const Token = await ethers.getContractFactory("MyTokenForBridge");
  const token = await Token.deploy("MyTokenForBridge", "MTK") as any;
  await token.deployed();
  console.log("Token deployed to:", token.address);
  // Минтим токены юзеру
  const [deployer] = await ethers.getSigners();
  await token.mint(deployer.address, UserMintToken);
  console.log("Минтим токены пользователю:", deployer.address);

  // Деплоим контракт моста
  const BridgeEmv = await ethers.getContractFactory("BridgeEmv");
  const bridgeEmv = await BridgeEmv.deploy(CHAIN_ID, VALIDATOR_ADDRESS) as any;
  await bridgeEmv.deployed();
  console.log("bridgeEmv deployed to:", bridgeEmv.address);

  // Назначаем роль BRIDGE_ROLE мосту для управления токенами
  let BRIDGE_ROLE = await token.BRIDGE_ROLE();
  await token.grantRole(BRIDGE_ROLE, bridgeEmv.address);
  console.log("Выдаем роль BRIDGE_ROLE мосту для управления токенами");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
