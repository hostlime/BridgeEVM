# Bridge ETH/BSC

##### Принцип работы следующий:
    Контракт моста разворачивается в обоих сетях с указанием, в конструкторе, 
    chainid и и адрес валидатора(бэкенд). 
    После деплоя контракта необходимо добавить адрес токена для передачи в другую сеть. Добавление токена осуществляется функцией: 
    ```shell
    includeToken((адрес контракта токена) => (chainID сети назначения => (адрес токена в сети назначения)))
    ```
    Для передачи токенов из ETH в BSC сеть необходимо:
    1 - Вызвать функцию swap(...), контракта BridgeEmv, в сети ETH:
    swap()
    Данная функция сжигает передаваемые токены и генерирует event, который позволит
    БЭКЕНДУ сгенерировать подпись, которая в свою очередь позволит нам доказать, в другой сети, что swap() уже вызывался и можно переводить токены на указанный адрес.
2 - Вызвать функцию Redeem(.......) контракта BridgeEmv в сети BSC 
    Данная функция проверяет что принимаемая сигнатура была подписана ВАЛИДАТОРОМ
    для данных, которые переданы в параметрах и минтит токены.

    !!! Этап с подписью ВАЛИДАТОРОМ можно исключить и подписывать данные о переводе отправителем, но в данном алгоритме важно чтобы подпись была сгенерирована ВАЛИДАТОРОМ "signerBackend".
 
##### Тестовые контракты и транзакции
- Контракт токена ETH https://rinkeby.etherscan.io/address/0x5ba5da98d00bdd22b81fa2f40741632f9437b9e2
- Контракт моста ETH https://rinkeby.etherscan.io/address/0x2fb449ae63dde2b2b71ef071525db559b842327a
- Контракт токена BSC https://testnet.bscscan.com/address/0xff963bd6638cfbf1389631b32a32b046fb8e6e44
- Контракт моста BSC https://rinkeby.etherscan.io/address/0xb82735c448970E71529eBa3FF6311606275ad27f
- SWAP ETH=>BSC https://rinkeby.etherscan.io/tx/0xea83bd520aa1aabb93578cdeb5be499f4e7751d21021ea0556bad77c766d54e0
- REDEEM in BSC https://testnet.bscscan.com/tx/0x5478da8705ae363ea196f018b8ca3d9781ae272801543fed55d3281cff3163a4#eventlog


##### Функционал:
- Функция swap(): списывает токены с пользователя и испускает event ‘swapInitialized’
- Функция redeem(): вызывает функцию ecrecover и восстанавливает по хэшированному сообщению и сигнатуре адрес валидатора, если адрес совпадает с адресом указанным на контракте моста то пользователю отправляются токены
- Функция updateChainById(): добавить блокчейн или удалить по его chainID
- Функция includeToken(): добавить токен для передачи его в другую сеть
- Функция excludeToken(): исключить токен для передачи

##### npx hardhat test:
```shell
Bridge
    ✔ Checking that contract BridgeBSC is deployed
    ✔ Checking that contract TokenBSC is deployed
    ✔ Checking that contract TokenETH is deployed
    ✔ Checking that contract BridgeETH is deployed
    ✔ Checking that bridgeBSC has role a BRIDGE_ROLE
    ✔ Checking that bridgeETH has role a BRIDGE_ROLE
    ✔ Checking function swap() (151ms)
    ✔ Checking that emission token is in ETH
    ✔ Checking function redeem() ETH => BSC => ETH (328ms)
    ✔ Checking function includeToken() (48ms)
    ✔ Checking function excludeToken() (45ms)
    ✔ Checking function updateChainById()
```
##### npx hardhat coverage:
```shell
---------------------|----------|----------|----------|----------|----------------|
File                 |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
---------------------|----------|----------|----------|----------|----------------|
 contracts\          |      100 |      100 |      100 |      100 |                |
  BridgeEVM.sol      |      100 |      100 |      100 |      100 |                |
  TokenForBridge.sol |      100 |      100 |      100 |      100 |                |
---------------------|----------|----------|----------|----------|----------------|
All files            |      100 |      100 |      100 |      100 |                |
---------------------|----------|----------|----------|----------|----------------|
```