// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ZombieHelper.sol";

contract ZombieBattle is ZombieHelper {
    uint256 randNonce = 0;
    uint256 attackVictoryProbability = 70;

    function randMod(uint256 _modulus) internal returns (uint256) {
        randNonce++;

        return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % _modulus;
    }

    function attack(uint256 _zombieId, uint256 _targetId) external onlyOwnerOf(_zombieId) {
        // 原教程没有这个检查
        // 会导致问题：如果攻击获胜，但是又没冷却，事务失败；如果攻击失败，无论是否冷却，事务都可以成功
        // 所以应该在这里应该加上检测
        require(_isReady(zombies[_zombieId]), "no ready");

        Zombie storage myZombie = zombies[_zombieId];
        Zombie storage enemyZombie = zombies[_targetId];

        uint256 rand = randMod(100);

        if (rand <= attackVictoryProbability) {
            myZombie.winCount++;
            myZombie.level++;

            enemyZombie.lossCount++;

            feedAndMultiply(_zombieId, enemyZombie.dna, "zombie");
        } else {
            myZombie.lossCount++;
            enemyZombie.winCount++;
            _triggerCooldown(myZombie);
        }
    }
}
