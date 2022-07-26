const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployMockContract } = require("@ethereum-waffle/mock-contract");
const { expect } = require("chai");
const CryptoKittiesABI = require("./abis/CryptoKitties.json");

describe("ZombieFeeding", function () {
  async function deployContractFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const ZombieFeeding = await ethers.getContractFactory("ZombieFeeding");
    const zombieFeeding = await ZombieFeeding.deploy();

    const mockCryptoKitties = await deployMockContract(owner, CryptoKittiesABI);
    await mockCryptoKitties.mock.getKitty.returns(true, true, 3, 4, 5, 6, 7, 8, 9, 10);

    return { mockCryptoKitties, zombieFeeding, owner, otherAccount };
  }

  describe("部署", function () {
    it("部署合约&&检查接口", async function () {
      const { mockCryptoKitties, zombieFeeding } = await loadFixture(deployContractFixture);

      expect(zombieFeeding).to.have.property("zombies");
      expect(zombieFeeding).to.have.property("createRandomZombie");

      expect(zombieFeeding).to.have.property("setKittyContractAddress");
      expect(zombieFeeding).to.have.property("feedOnKitty");

      expect(await mockCryptoKitties.getKitty(0)).to.lengthOf(10);
    });
  });

  describe("setKittyContractAddress", function () {
    it("管理员可以设置 CryptoKitties 合约地址", async function () {
      const { mockCryptoKitties, zombieFeeding } = await loadFixture(deployContractFixture);

      const tx = await zombieFeeding.setKittyContractAddress(mockCryptoKitties.address);
      expect(tx).to.have.property("hash");
    });

    it("非管理员不可以设置 CryptoKitties 合约地址", async function () {
      const { mockCryptoKitties, zombieFeeding, otherAccount } = await loadFixture(deployContractFixture);

      await expect(zombieFeeding.connect(otherAccount).setKittyContractAddress(mockCryptoKitties.address)).to.be
        .revertedWithoutReason;
    });
  });

  describe("feedOnKitty", function () {
    it("未设置KittyContract捕食会失败", async function () {
      const { mockCryptoKitties, zombieFeeding } = await loadFixture(deployContractFixture);

      await expect(zombieFeeding.feedOnKitty(0, 0)).to.be.revertedWithoutReason;
    });

    it("不能使用未拥有的僵尸进行捕食", async function () {
      const { mockCryptoKitties, zombieFeeding } = await loadFixture(deployContractFixture);
      await zombieFeeding.setKittyContractAddress(mockCryptoKitties.address);

      await expect(zombieFeeding.feedOnKitty(0, 0)).to.be.revertedWith("no have zombie");
    });

    it("新创建的僵尸，未到达冷却时间，不可以捕食", async function () {
      const { mockCryptoKitties, zombieFeeding } = await loadFixture(deployContractFixture);
      await zombieFeeding.setKittyContractAddress(mockCryptoKitties.address);
      await zombieFeeding.createRandomZombie("zombie_0");

      await expect(zombieFeeding.feedOnKitty(0, 0)).to.be.revertedWith("no ready");
    });

    it("捕食后，会产生新的僵尸", async function () {
      const { mockCryptoKitties, zombieFeeding } = await loadFixture(deployContractFixture);

      await zombieFeeding.setKittyContractAddress(mockCryptoKitties.address);
      await zombieFeeding.createRandomZombie("zombie_0");
      await time.increase(24 * 60 * 60);
      await zombieFeeding.feedOnKitty(0, 0);

      //  创建1个，繁衍1个，当前有2个僵尸
      expect(await zombieFeeding.zombies(1)).to.have.lengthOf(6);
      await expect(zombieFeeding.zombies(2)).to.rejectedWith("call revert exception");
    });

    it("捕食后，冷却时间重置，此时不可以继续捕食", async function () {
      const { mockCryptoKitties, zombieFeeding } = await loadFixture(deployContractFixture);

      await zombieFeeding.setKittyContractAddress(mockCryptoKitties.address);
      await zombieFeeding.createRandomZombie("zombie_0");
      await time.increase(24 * 60 * 60);
      await zombieFeeding.feedOnKitty(0, 0);

      await expect(zombieFeeding.feedOnKitty(0, 0)).to.be.revertedWith("no ready");
    });
  });
});
