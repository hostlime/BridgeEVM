import { task } from "hardhat/config";



// npx hardhat swap --contractaddress 0xf6F3Ddb6353cA18E93D8Fe1eb26430dD9682E9aa --tokenaddress 0x0702faA314e65a6938B5503D6b639779ff5415B1  --to 0xC263718b809ab3EF9C816d7A2313ef0CA0Bb58a1  --amount 5 --chainid 97 --network rinkeby
task("swap", "swap token")
    .addParam("contractaddress", "The bridge contract address on ETH")
    .addParam("tokenaddress", "Token contract address")
    .addParam("to", "address to")
    .addParam("amount", "amount")
    .addParam("chainid", "tochainid")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("BridgeEmv", taskArgs.contractaddress)
        await contract.swap(taskArgs.tokenaddress, taskArgs.to, taskArgs.amount, taskArgs.chainid);
    });

//npx hardhat reedem --contractaddress 0xf6F3Ddb6353cA18E93D8Fe1eb26430dD9682E9aa --tokenaddress 0x0702faA314e65a6938B5503D6b639779ff5415B1  --to 0xC263718b809ab3EF9C816d7A2313ef0CA0Bb58a1 --v 27  --r 0xfdaded4714697ed7c18348fd19925164373ff5f3b1c6eff03b5ca3d9805435a7  --s 0x1c244a58cf95d6c4f61614edd92eec09245fef61a056b5e41d0679b318029aeb  --amount 5 --nonce 1 --network rinkeby
task("reedem", "mint token")
    .addParam("contractaddress", "The bridge contract address on BSC")
    .addParam("tokenaddress", "Token contract address")
    .addParam("to", "to")
    .addParam("amount", "amount")
    .addParam("nonce", "nonce")
    .addParam("r", "r")
    .addParam("s", "s")
    .addParam("v", "v")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("BridgeEmv", taskArgs.contractaddress)
        await contract.redeem(
            taskArgs.tokenaddress,
            taskArgs.to,
            taskArgs.amount,
            taskArgs.nonce,
            taskArgs.r,
            taskArgs.s,
            taskArgs.v
        );
    });
