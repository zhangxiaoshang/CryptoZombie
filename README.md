# CryptoZombie

原项目：[Loom 智能合约开发在线免费课程](https://cryptozombies.io/zh/course/)

本项目处于学习目的，使用只能合约开发框架[Hardhat](https://hardhat.org/)对原项目进行实现。
相对原项目主要有以下变化：

1. 使用了合约开发框架 Hardhat,方便本地开发调试
2. solidity 的版本由 `^0.4.19` 升级为 `^0.8.9`, 并对合约实现进行了相应调整
3. 增加了较为完备的单元测试(58 项)

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```

## 合约继承关系

- ZombieFactory
  - ZombieFeeding
    - ZombieHelper
      - ZombieBattle
        - ZombieOwnership
