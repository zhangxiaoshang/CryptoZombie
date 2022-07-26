const { time, loadFixture, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { deployMockContract } = require("@ethereum-waffle/mock-contract");
const { expect } = require("chai");
const CryptoKittiesABI = require("./abis/CryptoKitties.json");
const { ethers } = require("hardhat");

describe("ZombieBattle", function () {
  async function deployContractFixture() {
    const [owner, ...otherAccounts] = await ethers.getSigners();

    const ZombieBattle = await ethers.getContractFactory("ZombieBattle");
    const zombieBattle = await ZombieBattle.deploy();

    return { zombieBattle, owner, otherAccounts };
  }

  describe("部署", function () {
    it("部署合约&&检查接口", async function () {
      const { zombieBattle } = await loadFixture(deployContractFixture);

      expect(zombieBattle).to.have.property("zombies");
      expect(zombieBattle).to.have.property("createRandomZombie");

      expect(zombieBattle).to.have.property("setKittyContractAddress");
      expect(zombieBattle).to.have.property("feedOnKitty");

      expect(zombieBattle).to.have.property("changeName");
      expect(zombieBattle).to.have.property("changeDna");
      expect(zombieBattle).to.have.property("getZombiesByOwner");
      expect(zombieBattle).to.have.property("levelUp");
      expect(zombieBattle).to.have.property("withdraw");
      expect(zombieBattle).to.have.property("setLevelUpFee");

      expect(zombieBattle).to.have.property("attack");
    });
  });

  describe("attack", function () {
    it("不能使用未拥有的僵尸进行攻击", async function () {
      const { zombieBattle, otherAccounts } = await loadFixture(deployContractFixture);
      const [u1, u2, u3] = otherAccounts;

      await zombieBattle.connect(u1).createRandomZombie("zombie_u1");
      await zombieBattle.connect(u2).createRandomZombie("zombie_u2");

      await expect(zombieBattle.connect(u3).attack(0, 1)).to.be.revertedWith("no have zombie");
    });

    it("攻击获胜，数据更新正确", async function () {
      const { zombieBattle, otherAccounts } = await loadFixture(deployContractFixture);
      const [u1, u2, u3] = otherAccounts;

      await zombieBattle.connect(u1).createRandomZombie("zombie_u1");
      await zombieBattle.connect(u2).createRandomZombie("zombie_u2");

      let zombieBefore;
      let enemyZombieBefore;
      let zombieAfter;
      let enemyZombieAfter;
      let myZombiesBefore;
      let enemyZombiesBefore;
      let myZombiesAfter;
      let enemyZombiesAfter;
      let isWin = false;

      while (!isWin) {
        zombieBefore = await zombieBattle.zombies(0);
        enemyZombieBefore = await zombieBattle.zombies(1);
        myZombiesBefore = await zombieBattle.getZombiesByOwner(u1.address);
        enemyZombiesBefore = await zombieBattle.getZombiesByOwner(u2.address);

        // 攻击
        const oneDay = 24 * 60 * 60;
        await time.increase(oneDay);
        await zombieBattle.connect(u1).attack(0, 1);

        zombieAfter = await zombieBattle.zombies(0);
        enemyZombieAfter = await zombieBattle.zombies(1);
        myZombiesAfter = await zombieBattle.getZombiesByOwner(u1.address);
        enemyZombiesAfter = await zombieBattle.getZombiesByOwner(u2.address);

        isWin = zombieAfter.level === zombieBefore.level + 1;
      }

      expect(myZombiesAfter).to.lengthOf(myZombiesBefore.length + 1);
      expect(enemyZombiesAfter).to.lengthOf(enemyZombiesAfter.length);

      expect(zombieAfter.level).to.equal(zombieBefore.level + 1);
      expect(zombieAfter.winCount).to.equal(zombieBefore.winCount + 1);
      expect(zombieAfter.lossCount).to.equal(zombieBefore.lossCount);

      expect(enemyZombieAfter.winCount).to.equal(enemyZombieBefore.winCount);
      expect(enemyZombieAfter.lossCount).to.equal(enemyZombieBefore.lossCount + 1);
    });

    it("攻击失败，数据更新正确", async function () {
      const { zombieBattle, otherAccounts } = await loadFixture(deployContractFixture);
      const [u1, u2, u3] = otherAccounts;

      await zombieBattle.connect(u1).createRandomZombie("zombie_u1");
      await zombieBattle.connect(u2).createRandomZombie("zombie_u2");

      let zombieBefore;
      let enemyZombieBefore;
      let zombieAfter;
      let enemyZombieAfter;
      let myZombiesBefore;
      let enemyZombiesBefore;
      let myZombiesAfter;
      let enemyZombiesAfter;
      let isWin = true;

      while (isWin) {
        zombieBefore = await zombieBattle.zombies(0);
        enemyZombieBefore = await zombieBattle.zombies(1);
        myZombiesBefore = await zombieBattle.getZombiesByOwner(u1.address);
        enemyZombiesBefore = await zombieBattle.getZombiesByOwner(u2.address);

        // 攻击
        const oneDay = 24 * 60 * 60 + 1;
        await time.increase(oneDay);
        await zombieBattle.connect(u1).attack(0, 1);

        zombieAfter = await zombieBattle.zombies(0);
        enemyZombieAfter = await zombieBattle.zombies(1);
        myZombiesAfter = await zombieBattle.getZombiesByOwner(u1.address);
        enemyZombiesAfter = await zombieBattle.getZombiesByOwner(u2.address);

        isWin = zombieAfter.level === zombieBefore.level + 1;
      }

      expect(myZombiesAfter).to.lengthOf(myZombiesBefore.length);
      expect(enemyZombiesAfter).to.lengthOf(enemyZombiesAfter.length); // 敌方获胜，不繁衍僵尸

      expect(zombieAfter.level).to.equal(zombieBefore.level);
      expect(zombieAfter.winCount).to.equal(zombieBefore.winCount);
      expect(zombieAfter.lossCount).to.equal(zombieBefore.lossCount + 1);

      expect(enemyZombieAfter.winCount).to.equal(enemyZombieBefore.winCount + 1);
      expect(enemyZombieAfter.lossCount).to.equal(enemyZombieBefore.lossCount);
    });

    it("攻击失败，进入冷却状态，不可以继续攻击", async function () {
      const { zombieBattle, otherAccounts } = await loadFixture(deployContractFixture);
      const [u1, u2, u3] = otherAccounts;

      await zombieBattle.connect(u1).createRandomZombie("zombie_u1");
      await zombieBattle.connect(u2).createRandomZombie("zombie_u2");

      let zombieBefore;
      let zombieAfter;
      let isWin = true;

      while (isWin) {
        zombieBefore = await zombieBattle.zombies(0);

        // 攻击
        const oneDay = 24 * 60 * 60;
        await time.increase(oneDay);
        await zombieBattle.connect(u1).attack(0, 1);

        zombieAfter = await zombieBattle.zombies(0);
        isWin = zombieAfter.level === zombieBefore.level + 1;
      }

      expect(isWin).to.be.false;
      await expect(zombieBattle.connect(u1).attack(0, 1)).to.rejectedWith("no ready");
    });

    it("攻击获胜，进入冷却状态，不可以继续攻击", async function () {
      const { zombieBattle, otherAccounts } = await loadFixture(deployContractFixture);
      const [u1, u2, u3] = otherAccounts;

      await zombieBattle.connect(u1).createRandomZombie("zombie_u1");
      await zombieBattle.connect(u2).createRandomZombie("zombie_u2");

      let zombieBefore;
      let zombieAfter;
      let loss = true;

      while (loss) {
        zombieBefore = await zombieBattle.zombies(0);

        // 攻击
        const oneDay = 24 * 60 * 60;
        await time.increase(oneDay);
        await zombieBattle.connect(u1).attack(0, 1);
        zombieAfter = await zombieBattle.zombies(0);

        loss = zombieAfter.level === zombieBefore.level + 1;
      }

      expect(loss).to.be.false;
      await expect(zombieBattle.connect(u1).attack(0, 1)).to.rejectedWith("no ready");
    });
  });
});
