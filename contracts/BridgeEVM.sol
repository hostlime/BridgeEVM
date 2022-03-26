//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./TokenForBridge.sol";

contract BridgeEmv is AccessControl {
    /*
    Принцип работы следующий:
     Контракт моста разворачивается в обоих сетях с указанием, в конструкторе, 
     адреса контракта на токен и ID сети. 
     Важно: В качестве адреса токена необходимо указать адрес на контракт токена 
     размещенный в той же сети. 
     Итого: Мы должны иметь 2 контракта в сети BSC и 2 контракта всети ETH.
     Для передачи токенов из ETH в BSC сеть необходимо:
     1 - Вызвать функцию swap(...), контракта BridgeEmv, в сети ETH:
        swap(адрес получателя в сети BSC, количество токенов,id сети BSC = 97)
     Данная функция сжигает передаваемые токены и генерирует event, который позволит
     БЭКЕНДУ сгенерировать подпись, которая в свою очередь позволит нам доказать, в другой сети,
    что swap() уже вызывался и можно переводить токены на указанный адрес.
    2 - Вызвать функцию Redeem(.......) контракта BridgeEmv в сети BSC 
        Данная функция проверяет что принимаемая сигнатура была подписана БЭКЕНДОМ
        для данных, которые переданы в параметрах и минтит токены.

     !!! Этап с подписью БЭКЕНДОМ можно исключить и подписывать данные о переводе отправителем, 
     но в данном алгоритме важно чтобы подпись была сгенерирована БЭКЕНДОМ "signerBackend".
    */

    // ID эфириум подобной цепи
    // Используется в функции redeem() для генерации HASH на данные и исключает возможность
    // попытки вызова redeem в другой сети.
    uint256 public chainID;

    // Использем билиотеку ECDSA для типа данных bytes32
    using ECDSA for bytes32;

    // Счетчик nonce для уникализации подписей
    using Counters for Counters.Counter;
    Counters.Counter private _nonce;

    // Адрес бэкенда, который подписывает подтверждения Swap()
    address private signerValidator;

    // маппинг для исключения повторных вывозовов redeem()
    mapping(bytes32 => bool) private hashComplete;

    // Токены, которые участвуют в транспортировке через мост
    // (токен нашей сети) => (chainID другой сети => (адрес токена другой сети))
    mapping(address => mapping(uint256 => address)) public supportTokens;

    event Swap(
        address indexed _from,
        address indexed _to,
        uint256 indexed _amount,
        uint256 _chainID,
        uint256 _nonce
    );
    event Redeem(
        address indexed _to,
        uint256 indexed _amount,
        uint256 _chainID,
        uint256 _nonce
    );

    constructor(uint256 _chainID, address _backend) {
        chainID = _chainID; // Id сети, в которой развернут контракт
        signerValidator = _backend; // Адрес бэкенда
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // - Функция includeToken(): добавить токен для передачи его в другую сеть
    function includeToken(
        address _tokenFrom,
        address _tokenTo,
        uint256 _toChainId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportTokens[_tokenFrom][_toChainId] = _tokenTo;
    }

    // - Функция excludeToken(): исключить токен для передачи
    function excludeToken(address _tokenFrom, uint256 _toChainId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        delete (supportTokens[_tokenFrom][_toChainId]);
    }

    // - Функция updateChainById(): добавить блокчейн или удалить по его chainID
    // Удаление производится путем передачи _tokenTo = 0
    function updateChainById(
        address _tokenFrom,
        address _tokenTo,
        uint256 _toChainId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportTokens[_tokenFrom][_toChainId] = _tokenTo;
    }

    // Вызываем в сети отправаляющей токены
    function swap(
        address _tokenAddr, // Адрес контракта токенов, с которого списываются токены
        address _to, // Адрес куда переводятся токены в другом чейне
        uint256 _amount,
        uint256 _toChainId
    ) external returns (uint256 _nonce_) {
        require(
            supportTokens[_tokenAddr][_toChainId] != address(0x0),
            "bridge does not support this token"
        );

        _nonce_ = _nonce.current();
        _nonce.increment();
        MyTokenForBridge(_tokenAddr).burn(msg.sender, _amount);
        emit Swap(msg.sender, _to, _amount, _nonce_, _toChainId);
    }

    // Вызываем в сети принимающей токены
    function redeem(
        address _tokenAddr, // Контракт токенов
        address _to, // Адрес куда переводятся токены
        uint256 _amount,
        uint256 _nonce_,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) external {
        // упаковываем данные
        bytes32 signedDataHash = keccak256(
            abi.encodePacked(_to, _amount, _nonce_, chainID)
        );
        require(hashComplete[signedDataHash] == false, "Tokens already sent");
        // Добавляем Ethereum Signed Message
        bytes32 messageHash = signedDataHash.toEthSignedMessageHash();
        // Получаем адрес того кто подписывал сигнатуру (v, r, s)
        address signer = messageHash.recover(v, r, s);
        // БЭКЕН генерировал сигнатуру?
        require(signerValidator == signer, "The signature is not made backend");
        // Минтим токены
        MyTokenForBridge(_tokenAddr).mint(_to, _amount);
        // Запоминаем что этот _nonce_ уже обработан
        hashComplete[signedDataHash] = true;
        emit Redeem(_to, _amount, _nonce_, chainID);
    }
}
