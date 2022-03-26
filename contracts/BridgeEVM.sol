//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./TokenForBridge.sol";

contract BridgeEmv {
    /*
    Принцип работы моста следующий:
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

    // Токен, который участвует в транспортировке через мост
    MyTokenForBridge private _token;

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
    // Для тестового проекта ЗАХАРДКОДИМ адрес, но для реального проекта необходимы методы для его изменения админом
    address private signerBackend =
        address(0xC263718b809ab3EF9C816d7A2313ef0CA0Bb58a1);

    // маппинг для исключения повторных вывозовов redeem()
    mapping(uint256 => bool) private redeemComplete;

    event Swap(
        address indexed _to,
        uint256 indexed _amount,
        uint256 _chainID,
        uint256 _nonce
    );
    event Redeem(
        address indexed _from,
        address indexed _to,
        uint256 indexed _amount,
        uint256 _chainID,
        uint256 _nonce
    );

    constructor(MyTokenForBridge _token_, uint256 _chainID) {
        _token = _token_; // Адрес на токен
        chainID = _chainID; // Id сети, в которой развернут контракт
    }

    // Вызываем в сети отправаляющей токены
    function swap(
        address _to,
        uint256 _amount,
        uint256 _chainId
    ) external returns (uint256 _nonce_) {
        _nonce_ = _nonce.current();
        _nonce.increment();
        _token.burn(msg.sender, _amount);
        emit Swap(_to, _amount, _chainId, _nonce_);
    }

    // Вызываем в сети принимающей токены
    function redeem(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _nonce_,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) external {
        require(redeemComplete[_nonce_] == false, "Tokens already sent");
        // упаковываем данные
        bytes32 signedDataHash = keccak256(
            abi.encodePacked(_from, _to, _amount, _nonce_, chainID)
        );
        // Добавляем Ethereum Signed Message
        bytes32 messageHash = signedDataHash.toEthSignedMessageHash();
        // Получаем адрес того кто подписывал сигнатуру (v, r, s)
        address signer = messageHash.recover(v, r, s);
        // БЭКЕН генерировал сигнатуру?
        require(signerBackend == signer, "The signature is not made backend");
        // Минтим токены
        _token.mint(_to, _amount);
        // Запоминаем что этот _nonce_ уже обработан
        redeemComplete[_nonce_] = true;
        emit Redeem(_from, _to, _amount, _nonce_, chainID);
    }

    function sigDataHash(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _nonce_
    ) external view returns (bytes32) {
        return
            keccak256(abi.encodePacked(_from, _to, _amount, _nonce_, chainID));
    }

    /*
	function formMessage(address to, uint256 amount, uint256 nonce) public pure 
    returns (bytes32 message)
	{
		message = keccak256(abi.encodePacked(to, amount,  nonce));
	}
    function fsignedDataHash1(address _to, uint256 _amount, uint256 nonce) public pure returns(bytes32){
        return keccak256(abi.encodePacked(_to, _amount, nonce));
    }
    function fmessageHash2(bytes32 _signedDataHash) public pure returns(bytes32){
        return _signedDataHash.toEthSignedMessageHash();
    }
    function fecrecover3(bytes32 _messageHash, bytes32 r, bytes32 s, uint8 v) public pure returns(address){
        return ecrecover(_messageHash, v, r, s);
    }
	function hashMessage(bytes32 message) public pure returns (bytes32) {
		bytes memory prefix = "\x19Ethereum Signed Message:\n32";
		return keccak256(abi.encodePacked(prefix, message));
	}
	*/
    function splitSignature(bytes memory sig)
        public
        pure
        returns (
            uint8,
            bytes32,
            bytes32
        )
    {
        require(sig.length == 65);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }
}
