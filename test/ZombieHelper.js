const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployMockContract } = require("@ethereum-waffle/mock-contract");
const { expect } = require("chai");
const CryptoKittiesABI = require("./abis/CryptoKitties.json");
const { ethers } = require("hardhat");

describe("ZombieHelper", function () {
  async function deployContractFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const ZombieHelper = await ethers.getContractFactory("ZombieHelper");
    const zombieHelper = await ZombieHelper.deploy();

    const mockCryptoKitties = await deployMockContract(owner, CryptoKittiesABI);
    await mockCryptoKitties.mock.getKitty.returns(true, true, 3, 4, 5, 6, 7, 8, 9, 10);

    return { mockCryptoKitties, zombieHelper, owner, otherAccount };
  }

  describe("部署", function () {
    it("部署合约&&检查接口", async function () {
      const { zombieHelper } = await loadFixture(deployContractFixture);

      expect(zombieHelper).to.have.property("zombies");
      expect(zombieHelper).to.have.property("createRandomZombie");

      expect(zombieHelper).to.have.property("setKittyContractAddress");
      expect(zombieHelper).to.have.property("feedOnKitty");

      expect(zombieHelper).to.have.property("changeName");
      expect(zombieHelper).to.have.property("changeDna");
      expect(zombieHelper).to.have.property("getZombiesByOwner");
      expect(zombieHelper).to.have.property("levelUp");
      expect(zombieHelper).to.have.property("withdraw");
      expect(zombieHelper).to.have.property("setLevelUpFee");
    });
  });

  describe("changeName", function () {
    it("2级以下的僵尸不能重命名", async function () {
      const { zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");

      await expect(zombieHelper.changeName(0, "zombie_0_newname")).to.be.revertedWith("level too low");
    });

    it("不能给未拥有的僵尸重命名", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");
      await zombieHelper.levelUp(0, { value: ethers.utils.parseEther("0.001") });

      const changeName = zombieHelper.connect(otherAccount).changeName(0, "zombie_0_newname");
      await expect(changeName).to.be.revertedWith("no have zombie");
    });

    it("2级或2级以上,已拥有的僵尸,可以重命名", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");
      await zombieHelper.levelUp(0, { value: ethers.utils.parseEther("0.001") });

      let zombie = await zombieHelper.zombies(0);
      expect(zombie.name).to.equal("zombie_0");

      await zombieHelper.changeName(0, "zombie_0_newname");
      zombie = await zombieHelper.zombies(0);
      expect(zombie.name).to.equal("zombie_0_newname");
    });
  });

  describe("changeDna", function () {
    it("20级以下不可以修改DNA", async function () {
      const { zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");

      await expect(zombieHelper.changeDna(0, 123456)).to.be.revertedWith("level too low");
    });

    it("不能给未拥有的僵尸修改DNA", async function () {
      const { zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");
      // 升级到20
      for (let i = 0; i < 20; i++) {
        await zombieHelper.levelUp(0, { value: ethers.utils.parseEther("0.001") });
      }
      let zombie = await zombieHelper.zombies(0);
      expect(zombie.name).to.equal("zombie_0");

      await expect(zombieHelper.connect(otherAccount).changeDna(0, 123456)).to.be.rejectedWith("no have zombie");
    });

    it("20级或20级以上,已拥有的僵尸,可以修改DNA", async function () {
      const { zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");
      let zombie = await zombieHelper.zombies(0);
      expect(zombie.level).to.equal(1);
      // 升级到20
      for (let i = 1; i < 20; i++) {
        await zombieHelper.levelUp(0, { value: ethers.utils.parseEther("0.001") });
      }
      zombie = await zombieHelper.zombies(0);
      await expect(zombie.level).to.be.equal(20);

      await zombieHelper.changeDna(0, 123456);
      zombie = await zombieHelper.zombies(0);
      expect(zombie.dna).to.equal(123456);
    });
  });

  describe("getZombiesByOwner", function () {
    it("默认拥有0个僵尸", async function () {
      const { zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      let ownerZombies = await zombieHelper.getZombiesByOwner(owner.address);
      expect(ownerZombies).to.lengthOf(0);
    });

    it("创建1个僵尸,捕食并繁衍1个僵尸后,应该拥有2个僵尸", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");

      await zombieHelper.setKittyContractAddress(mockCryptoKitties.address);
      await time.increase(24 * 60 * 60);
      await zombieHelper.feedOnKitty(0, 0);

      let ownerZombies = await zombieHelper.getZombiesByOwner(owner.address);
      expect(ownerZombies).to.lengthOf(2);
    });
  });

  describe("levelUp", function () {
    it("支付的金额和升级手续费不一致，不可以升级", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");
      await expect(zombieHelper.levelUp(0, { value: ethers.utils.parseEther("1") })).to.be.rejectedWith(
        "pay amount not matched"
      );
    });

    it("拥有者可以给自己的僵尸升级", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");
      await zombieHelper.levelUp(0, { value: ethers.utils.parseEther("0.001") });
      const zombie = await zombieHelper.zombies(0);
      expect(zombie.level).to.equal(2);
    });

    it("非拥有者可以给别人的僵尸升级", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");
      await zombieHelper.connect(otherAccount).levelUp(0, { value: ethers.utils.parseEther("0.001") });
      const zombie = await zombieHelper.zombies(0);
      expect(zombie.level).to.equal(2);
    });

    it("用户升级僵尸的手续费会转到合约账户", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");

      const levelUpFee = ethers.utils.parseEther("0.001");
      await expect(zombieHelper.levelUp(0, { value: levelUpFee })).to.changeEtherBalances(
        [owner, zombieHelper],
        [-levelUpFee, levelUpFee]
      );
    });
  });

  describe("withdraw", function () {
    it("不是管理员，不可以提现", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await expect(zombieHelper.connect(otherAccount).withdraw()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("管理员可以提现", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await zombieHelper.createRandomZombie("zombie_0");
      await zombieHelper.levelUp(0, { value: ethers.utils.parseEther("0.001") });
      const balance = await ethers.provider.getBalance(zombieHelper.address);

      await expect(zombieHelper.withdraw()).to.changeEtherBalances([owner, zombieHelper], [balance, -balance]);
    });
  });

  describe("setLevelUpFee", function () {
    it("非管理员不可以修改手续费", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      await expect(zombieHelper.connect(otherAccount).setLevelUpFee(ethers.utils.parseEther("1"))).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("管理员可以修改手续费", async function () {
      const { mockCryptoKitties, zombieHelper, owner, otherAccount } = await loadFixture(deployContractFixture);

      const newLevelUpFee = ethers.utils.parseEther("1");
      await zombieHelper.setLevelUpFee(newLevelUpFee);
      await zombieHelper.createRandomZombie("zombie_0");

      await expect(zombieHelper.levelUp(0, { value: newLevelUpFee })).to.changeEtherBalances(
        [owner, zombieHelper],
        [ethers.utils.parseEther("-1"), newLevelUpFee]
      );
    });
  });
});
