import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Bridge", function () {

  let adminETH: SignerWithAddress;
  let adminBSC: SignerWithAddress;
  let userETH: SignerWithAddress;
  let userBSC: SignerWithAddress;

  let backendUser: SignerWithAddress;

  let tokenETH: any;
  let bridgeETH: any;
  let tokenBSC: any;
  let bridgeBSC: any;

  let chainIdETH = 3;
  let chainIdBSC = 97;

  let UserMintToken = ethers.utils.parseEther("1000");
  let UserTransferToken = ethers.utils.parseEther("1");

  // создаём экземпляр контрактов
  beforeEach(async () => {
    [adminETH, adminBSC, userETH, userBSC, backendUser] = await ethers.getSigners();

    // Token ETH
    const TokenETH = await ethers.getContractFactory("MyTokenForBridge");
    tokenETH = await TokenETH.connect(adminETH).deploy("MyTokenForBridge", "MTK");
    await tokenETH.connect(adminETH).deployed();
    // Bridge ETH
    const BridgeETH = await ethers.getContractFactory("BridgeEmv");
    bridgeETH = await BridgeETH.connect(adminETH).deploy(chainIdETH, backendUser.address);
    await bridgeETH.connect(adminETH).deployed();
    // Назначаем роль BRIDGE_ROLE мосту для управления токенами
    let BRIDGE_ROLE = await tokenETH.connect(adminETH).BRIDGE_ROLE();
    await tokenETH.grantRole(BRIDGE_ROLE, bridgeETH.address);
    // Переводим юзеру токены
    await tokenETH.connect(adminETH).mint(userETH.address, UserMintToken);

    // Token BSC
    const TokenBSC = await ethers.getContractFactory("MyTokenForBridge");
    tokenBSC = await TokenBSC.connect(adminBSC).deploy("MyTokenForBridge", "MTK");
    await tokenBSC.connect(adminBSC).deployed();
    // Bridge BSC
    const BridgeBSC = await ethers.getContractFactory("BridgeEmv");
    bridgeBSC = await BridgeBSC.connect(adminBSC).deploy(chainIdBSC, backendUser.address);
    await bridgeBSC.connect(adminBSC).deployed();
    // Назначаем роль BRIDGE_ROLE мосту для управления токенами
    BRIDGE_ROLE = await tokenBSC.connect(adminBSC).BRIDGE_ROLE();
    await tokenBSC.grantRole(BRIDGE_ROLE, bridgeBSC.address);

    // добавляем токен для передачи его в другую сеть
    await bridgeETH.connect(adminETH).includeToken(tokenETH.address, tokenBSC.address, chainIdBSC);
    await bridgeBSC.connect(adminBSC).includeToken(tokenBSC.address, tokenETH.address, chainIdETH);
  });

  // Проверяем все контракты на деплой
  it('Checking that contract BridgeBSC is deployed', async () => {
    assert(bridgeBSC.address);
  });
  it('Checking that contract TokenBSC is deployed', async () => {
    assert(tokenBSC.address);
  });
  it('Checking that contract TokenETH is deployed', async () => {
    assert(tokenETH.address);
  });
  it('Checking that contract BridgeETH is deployed', async () => {
    assert(bridgeETH.address);
  });

  // проверка, что у МОСТА есть роль BRIDGE_ROLE и контракт может минтить и сжигать токены
  it('Checking that bridgeBSC has role a BRIDGE_ROLE', async () => {
    const BRIDGE_ROLE = await tokenBSC.BRIDGE_ROLE();
    const result = await tokenBSC.hasRole(BRIDGE_ROLE, bridgeBSC.address);
    expect(result).to.be.equal(true);
  });
  it('Checking that bridgeETH has role a BRIDGE_ROLE', async () => {
    const BRIDGE_ROLE = await tokenETH.BRIDGE_ROLE();
    const result = await tokenETH.hasRole(BRIDGE_ROLE, bridgeETH.address);
    expect(result).to.be.equal(true);
  });

  // SWAP  ETH => BSC
  it('Checking function swap()', async () => {
    // проверяем отправку токенов на несуществующий chainId
    await expect(bridgeETH.connect(userETH)
      .swap(tokenETH.address, userBSC.address, UserTransferToken, chainIdBSC + 1))
      .to.be.revertedWith(
        "bridge does not support this token"
      );

    const Tx = await bridgeETH.connect(userETH)
      .swap(tokenETH.address, userBSC.address, UserTransferToken, chainIdBSC);

    expect(await tokenETH.balanceOf(userETH.address))
      .to.be.equal(UserMintToken.sub(UserTransferToken));

    // Проверяем эвент Swap
    await expect(Tx).to.emit(bridgeETH, "Swap")
      .withArgs(userETH.address, userBSC.address, UserTransferToken, 0, chainIdBSC);
  });

  it('Checking that emission token is in ETH', async () => {
    expect(await tokenETH.balanceOf(userETH.address))
      .to.be.equal(UserMintToken);
  });

  it('Checking function redeem() ETH => BSC => ETH', async () => {
    // Делаем SWAP  ETH => BSC  
    await bridgeETH.connect(userETH)
      .swap(tokenETH.address, userBSC.address, UserTransferToken, chainIdBSC);

    expect(await tokenETH.balanceOf(userETH.address))
      .to.be.equal(UserMintToken.sub(UserTransferToken));
    // в сети пока 0 токенов
    expect(await tokenBSC.balanceOf(userBSC.address))
      .to.be.equal(0);

    const signedDataHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256", "uint256"],
      [userBSC.address, UserTransferToken, 0, chainIdBSC]
    );
    // At this step we are making ethers to treat data as bytes array,
    // not string
    const bytesArray = ethers.utils.arrayify(signedDataHash);

    const flatSignature = await backendUser.signMessage(bytesArray);
    const wrongSignature = await userBSC.signMessage(bytesArray);
    // We signed everything, but before knocking contract, we have to
    // split signature into 3 different components - v, r, s.
    const signature = ethers.utils.splitSignature(flatSignature);
    const wrongSig = ethers.utils.splitSignature(wrongSignature);

    // here are v, r and s - components of single EC digital signature
    //console.log(signature.v, signature.r, signature.s);

    // отправляем некорректную сигнатуру
    await expect(bridgeBSC.connect(userETH)
      .redeem(
        tokenBSC.address,
        userBSC.address,
        UserTransferToken,
        0,
        wrongSig.r,
        wrongSig.s,
        wrongSig.v
      )).to.be.revertedWith(
        "The signature is not made backend"
      );

    // Вызываем редим
    const Tx = await bridgeBSC.connect(userETH)
      .redeem(
        tokenBSC.address,
        userBSC.address,
        UserTransferToken,
        0,
        signature.r,
        signature.s,
        signature.v
      );

    // Проверяем эвент Redeem
    await expect(Tx).to.emit(bridgeBSC, "Redeem")
      .withArgs(
        userBSC.address,
        UserTransferToken,
        0,
        chainIdBSC,
      );

    // Проверяем балансы
    expect(await tokenETH.balanceOf(userETH.address))
      .to.be.equal(UserMintToken.sub(UserTransferToken));

    expect(await tokenBSC.balanceOf(userBSC.address))
      .to.be.equal(UserTransferToken);

    // Проверяем эфисиию (суммарное количество токенов обоих сетей не изменилось)
    const supplyTokenBSC = await tokenBSC.totalSupply()
    const supplyTokenETH = await tokenETH.totalSupply()

    expect(UserMintToken)
      .to.be.equal(supplyTokenBSC.add(supplyTokenETH));

    // Проверяем require
    // require(redeemComplete[_nonce_] == false, "Tokens already sent");
    await expect(bridgeBSC.connect(userETH)
      .redeem(
        tokenBSC.address,
        userBSC.address,
        UserTransferToken,
        0,
        signature.r,
        signature.s,
        signature.v
      )).to.be.revertedWith(
        "Tokens already sent"
      );
    //*************************** SWAP BSC => ETH ********************************** */
    // Делаем SWAP BSC => ETH
    await bridgeBSC.connect(userBSC)
      .swap(tokenBSC.address, userETH.address, UserTransferToken, chainIdETH);

    expect(await tokenBSC.balanceOf(userBSC.address))
      .to.be.equal(0);

    const signedDataHash2 = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256", "uint256"],
      [userETH.address, UserTransferToken, 0, chainIdETH]
    );
    const bytesArray2 = ethers.utils.arrayify(signedDataHash2);
    const flatSignature2 = await backendUser.signMessage(bytesArray2);
    const signature2 = ethers.utils.splitSignature(flatSignature2);

    // Вызываем редим
    const Tx2 = await bridgeETH.connect(userBSC)
      .redeem(
        tokenETH.address,
        userETH.address,
        UserTransferToken,
        0,
        signature2.r,
        signature2.s,
        signature2.v
      );

    // Проверяем эвент Redeem
    await expect(Tx2).to.emit(bridgeETH, "Redeem")
      .withArgs(
        userETH.address,
        UserTransferToken,
        0,
        chainIdETH,
      );

    // Проверяем балансы
    expect(await tokenETH.balanceOf(userETH.address))
      .to.be.equal(UserMintToken);
    expect(await tokenBSC.balanceOf(userBSC.address))
      .to.be.equal(0);

    // Проверяем эфисиию (суммарное количество токенов обоих сетей не изменилось)
    const supplyTokenBSC2 = await tokenBSC.totalSupply()
    const supplyTokenETH2 = await tokenETH.totalSupply()

    expect(UserMintToken)
      .to.be.equal(supplyTokenBSC2.add(supplyTokenETH2));
  });

});
