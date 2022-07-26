const { mine, time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyUint, anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZombieFactory", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployContractFixture() {
    const ZombieFactory = await ethers.getContractFactory("ZombieFactory");
    const zombieFactory = await ZombieFactory.deploy();

    const [owner, otherAccount] = await ethers.getSigners();

    return { zombieFactory, owner, otherAccount };
  }

  describe("部署", function () {
    it("部署合约&&检查接口", async function () {
      const { zombieFactory } = await loadFixture(deployContractFixture);

      expect(zombieFactory).to.have.property("zombies");
      expect(zombieFactory).to.have.property("createRandomZombie");
    });
  });

  describe("createRandomZombie", function () {
    it("用户可以创建1个僵尸", async function () {
      const { zombieFactory } = await loadFixture(deployContractFixture);

      const name = "Hello Kitty";
      const tx = await zombieFactory.createRandomZombie(name);
      const zombie = await zombieFactory.zombies(0);

      expect(zombie.name).to.equal(name);
      expect(zombie.dna.toString()).to.length.be(16);
      expect(zombie.level).to.equal(1);
      expect(zombie.readyTime).to.above(await time.latest());
      expect(zombie.winCount).to.equal(0);
      expect(zombie.lossCount).to.equal(0);
    });

    it("成功创建僵尸会触发事件: NewZombie", async function () {
      const { zombieFactory } = await loadFixture(deployContractFixture);

      await expect(zombieFactory.createRandomZombie("Hello Kitty"))
        .to.emit(zombieFactory, "NewZombie")
        .withArgs(0, "Hello Kitty", anyValue);
    });

    it("用户只能创建1个僵尸(多次创建会失败)", async function () {
      const { zombieFactory } = await loadFixture(deployContractFixture);

      await zombieFactory.createRandomZombie("0");
      await expect(zombieFactory.createRandomZombie("1")).to.be.reverted;
    });
  });
});
