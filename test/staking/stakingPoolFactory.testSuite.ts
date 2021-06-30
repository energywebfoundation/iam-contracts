import { expect } from "chai";
import { Signer, utils, Wallet } from "ethers";
import { RewardPool } from "../../ethers-v4/RewardPool";
import { StakingPoolFactory } from "../../ethers-v4/StakingPoolFactory";
import { RewardPool__factory, StakingPoolFactory__factory } from "../../src";
import { hashLabel } from "../iam-contracts.test";
import { ensRegistry, patronRole, deployer, root, roleResolver, defaultMinStakingPeriod, claimManager, defaultWithdrawDelay, provider } from "./staking.testSuite";

const { namehash, parseEther } = utils;

export function stakingPoolFactoryTests(): void {
  let stakingPoolFactory: StakingPoolFactory;
  let rewardPool: RewardPool;
  const service = "servicename";
  const patronRewardPortion = 80;
  let serviceProvider: Signer;
  const faucet = provider.getSigner(9);
  const principalThreshold = parseEther("0.1");

  async function getSigner() {
    const signer = Wallet.createRandom().connect(provider);
    await faucet.sendTransaction({ to: await signer.getAddress(), value: parseEther('1') });
    return signer;
  }

  async function setupContracts(
    { withdrawDelay = defaultWithdrawDelay }
      : { withdrawDelay?: number } = {}
  ) {
    rewardPool = await (await new RewardPool__factory(deployer).deploy()).deployed();
    stakingPoolFactory = await (await new StakingPoolFactory__factory(deployer).deploy(
      principalThreshold,
      withdrawDelay,
      claimManager.address,
      ensRegistry.address,
      rewardPool.address
    )).deployed();
  }

  async function registerServiceWithProvider(): Promise<void> {
    await (await ensRegistry.setSubnodeOwner(root, hashLabel(service), await serviceProvider.getAddress())).wait();
    await (await ensRegistry.connect(serviceProvider).setResolver(namehash(service), roleResolver.address)).wait();
  }

  beforeEach(async () => {
    serviceProvider = await getSigner();

    await setupContracts();
    await registerServiceWithProvider();
  });

  it("service owner can launch staking pool", async () => {
    return expect(stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold.mul(2) }
    )).fulfilled;
  });

  it("non owner of service should not be able to launch pool", async () => {
    const nonOwner = await getSigner();

    return expect(stakingPoolFactory.connect(nonOwner).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold }
    )).rejectedWith("StakingPoolFactory: Not authorized to create pool for this organization");
  });

  it("can't launch when principal less than threshold", async () => {
    return expect(stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod / 2,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold.div(2) }
    )).rejectedWith("StakingPoolFactory: principal less than threshold");
  });

  it("can't launch several pools for service", async () => {
    await stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod / 2,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold.mul(2) }
    );

    return expect(stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod / 2,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold.mul(2) }
    )).rejectedWith("StakingPool: pool for organization already launched");
  });
}