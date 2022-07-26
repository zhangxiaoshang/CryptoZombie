// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./ZombieFeeding.sol";

contract ZombieHelper is ZombieFeeding {
    uint256 levelUpFee = 0.001 ether; // TODO 应该设置 public

    modifier aboveLevel(uint256 _level, uint256 _zombieId) {
        require(zombies[_zombieId].level >= _level, "level too low");
        _;
    }

    function changeName(uint256 _zombieId, string calldata _newName)
        external
        aboveLevel(2, _zombieId)
        onlyOwnerOf(_zombieId)
    {
        zombies[_zombieId].name = _newName;
    }

    function changeDna(uint256 _zombieId, uint256 _newDna) external aboveLevel(20, _zombieId) onlyOwnerOf(_zombieId) {
        zombies[_zombieId].dna = _newDna;
    }

    function getZombiesByOwner(address _owner) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](ownerZombieCount[_owner]);

        uint256 counter = 0;
        for (uint256 i = 0; i < zombies.length; i++) {
            if (zombieToOwner[i] == _owner) {
                result[counter] = i; // TODO 直接push不行吗，可以少声明一个变量(不行！，因为声明时固定了长度，push会改变数组长度，这里无法使用)
                counter++;
            }
        }

        return result;
    }

    function levelUp(uint256 _zombieId) external payable {
        require(msg.value == levelUpFee, "pay amount not matched");

        zombies[_zombieId].level++;
    }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function setLevelUpFee(uint256 _fee) external onlyOwner {
        levelUpFee = _fee;
    }
}
