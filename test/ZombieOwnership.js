const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZombieOwnership", function () {
  async function deployContractFixture() {
    const [owner, ...otherAccounts] = await ethers.getSigners();

    const ZombieOwnership = await ethers.getContractFactory("ZombieOwnership");
    const zombieOwnership = await ZombieOwnership.deploy();

    return { zombieOwnership, owner, otherAccounts };
  }

  describe("部署", function () {
    it("部署合约&&检查接口", async function () {
      const { zombieOwnership } = await loadFixture(deployContractFixture);

      expect(zombieOwnership).to.have.property("zombies");
      expect(zombieOwnership).to.have.property("createRandomZombie");

      expect(zombieOwnership).to.have.property("setKittyContractAddress");
      expect(zombieOwnership).to.have.property("feedOnKitty");

      expect(zombieOwnership).to.have.property("changeName");
      expect(zombieOwnership).to.have.property("changeDna");
      expect(zombieOwnership).to.have.property("getZombiesByOwner");
      expect(zombieOwnership).to.have.property("levelUp");
      expect(zombieOwnership).to.have.property("withdraw");
      expect(zombieOwnership).to.have.property("setLevelUpFee");

      expect(zombieOwnership).to.have.property("attack");

      expect(zombieOwnership).to.have.property("balanceOf");
      expect(zombieOwnership).to.have.property("ownerOf");
      expect(zombieOwnership).to.have.property("transfer");
      expect(zombieOwnership).to.have.property("approve");
      expect(zombieOwnership).to.have.property("takeOwnership");
    });
  });

  describe("balanceOf", function () {
    it("默认有0个僵尸", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);

      expect(await zombieOwnership.balanceOf(owner.address)).to.equal(0);
    });

    it("创建僵尸后, 有1个僵尸", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);

      await zombieOwnership.createRandomZombie("zombie_0");
      expect(await zombieOwnership.balanceOf(owner.address)).to.equal(1);
    });

    it("创建僵尸后, 战斗获胜, 有2个僵尸, 敌方僵尸数量不变", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);
      const [u1] = otherAccounts;

      await zombieOwnership.createRandomZombie("zombie_0");
      await zombieOwnership.connect(u1).createRandomZombie("zombie_1");

      let beforeBattleZombie0;
      let beforeBattleZombie1;
      let afterBattleZombie0;
      let afterBattleZombie1;
      let loss = true;
      while (loss) {
        beforeBattleZombie0 = await zombieOwnership.zombies(0);
        beforeBattleZombie1 = await zombieOwnership.zombies(1);

        await time.increase(24 * 60 * 60);
        await zombieOwnership.attack(0, 1);

        afterBattleZombie0 = await zombieOwnership.zombies(0);
        afterBattleZombie1 = await zombieOwnership.zombies(1);

        loss = afterBattleZombie0.level === beforeBattleZombie0.level;
      }

      expect(loss).to.be.false;
      expect(await zombieOwnership.balanceOf(owner.address)).to.equal(2);
      expect(await zombieOwnership.balanceOf(u1.address)).to.equal(1);
    });
  });

  describe("ownerOf", function () {
    it("通过僵尸id获取拥有者地址", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);

      await zombieOwnership.createRandomZombie("zombie_0");
      const _owner = await zombieOwnership.ownerOf(0);

      expect(_owner).to.equal(owner.address);
    });
    it("id不存在时, 拥有者地址时0x00...", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);

      const _owner = await zombieOwnership.ownerOf(0);

      expect(_owner).to.equal(ethers.constants.AddressZero);
    });
  });
  describe("transfer", function () {
    it("不能转移为拥有的僵尸", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);

      await expect(zombieOwnership.transfer(otherAccounts[0].address, 0)).to.rejectedWith("no have zombie");
    });

    it("转移后，僵尸拥有者更新，双方拥有的僵尸数量正确", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);

      await zombieOwnership.createRandomZombie("zombie_0");
      await zombieOwnership.transfer(otherAccounts[0].address, 0);

      const balanceOfFrom = await zombieOwnership.balanceOf(owner.address);
      const balanceOfTo = await zombieOwnership.balanceOf(otherAccounts[0].address);

      expect(balanceOfFrom).to.equal(0);
      expect(balanceOfTo).to.equal(1);
    });

    it("转移后，正确触发事件：Transfer", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);

      await zombieOwnership.createRandomZombie("zombie_0");

      await expect(zombieOwnership.transfer(otherAccounts[0].address, 0))
        .to.emit(zombieOwnership, "Transfer")
        .withArgs(owner.address, otherAccounts[0].address, 0);
    });
  });

  describe("approve", function () {
    it("不能将未拥有的僵尸授权出去", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);

      await expect(zombieOwnership.approve(otherAccounts[0].address, 0)).to.revertedWith("no have zombie");
    });

    it("授权完成后正确触发事件：Approval", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);

      await zombieOwnership.createRandomZombie("zombie_0");
      await expect(zombieOwnership.approve(otherAccounts[0].address, 0))
        .to.emit(zombieOwnership, "Approval")
        .withArgs(owner.address, otherAccounts[0].address, 0);
    });
  });

  describe("takeOwnership", function () {
    it("不能获取未被授权的僵尸", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);
      const [u1] = otherAccounts;

      await zombieOwnership.createRandomZombie("zombie_0");

      await expect(zombieOwnership.connect(u1).takeOwnership(0)).to.revertedWith("no approval");
    });

    it("获取已被授权的僵尸", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);
      const [u1] = otherAccounts;

      await zombieOwnership.createRandomZombie("zombie_0");
      expect(await zombieOwnership.ownerOf(0)).to.equal(owner.address);

      await zombieOwnership.approve(u1.address, 0);
      await zombieOwnership.connect(u1).takeOwnership(0);

      expect(await zombieOwnership.ownerOf(0)).to.equal(u1.address);
    });
    it("获取僵尸后正确触发事件：Transfer", async function () {
      const { zombieOwnership, owner, otherAccounts } = await loadFixture(deployContractFixture);
      const [u1] = otherAccounts;

      await zombieOwnership.createRandomZombie("zombie_0");
      await zombieOwnership.approve(u1.address, 0);

      await expect(zombieOwnership.connect(u1).takeOwnership(0))
        .to.emit(zombieOwnership, "Transfer")
        .withArgs(owner.address, u1.address, 0);
    });
  });
});
