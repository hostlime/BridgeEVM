import { ethers } from "hardhat";
async function main() {
  /*
  npx hardhat run --network bscTestnet  scripts/deploy_bsc.ts
    No need to generate any newer typings.
    Token deployed to: 0xFF963bd6638CFbF1389631B32a32B046FB8e6e44
    bridgeEmv deployed to: 0xb82735c448970E71529eBa3FF6311606275ad27f
    Выдаем роль BRIDGE_ROLE мосту для управления токенами
 
   Верифицируем контракт токенов
  npx hardhat verify --network bscTestnet  0xFF963bd6638CFbF1389631B32a32B046FB8e6e44  "MyTokenForBridge" "MTK"
  https://testnet.bscscan.com/address/0xFF963bd6638CFbF1389631B32a32B046FB8e6e44

   Верифицируем контракт моста
  npx hardhat verify --network bscTestnet 0xb82735c448970E71529eBa3FF6311606275ad27f 97 0xC263718b809ab3EF9C816d7A2313ef0CA0Bb58a1
  https://testnet.bscscan.com/address/0xb82735c448970E71529eBa3FF6311606275ad27f
  */
  const VALIDATOR_ADDRESS = "0xC263718b809ab3EF9C816d7A2313ef0CA0Bb58a1";
  const CHAIN_ID = 97;
  //let UserMintToken = ethers.utils.parseEther("1000");

  const Token = await ethers.getContractFactory("MyTokenForBridge");
  const token = await Token.deploy("MyTokenForBridge", "MTK") as any;
  await token.deployed();
  console.log("Token deployed to:", token.address);
  // Минтим токены юзеру
  //const [deployer] = await ethers.getSigners();
  //await token.mint(deployer.address, UserMintToken);
  //console.log("Минтим токены пользователю:", deployer.address);

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
