import { expect } from "chai";
import { utils } from "ethers";
import { RewardPool } from "../../ethers-v4/RewardPool";
import { StakingPoolFactory } from "../../ethers-v4/StakingPoolFactory";
import { RewardPool__factory, StakingPoolFactory__factory } from "../../src";
import { hashLabel } from "../iam-contracts.test";
import { requestRole } from "../test_utils/role_utils";
import { ensRegistry, patronRole, deployer, ewc, root, roleResolver, roleFactory, defaultMinStakingPeriod, claimManager, defaultWithdrawDelay, provider } from "./staking.testSuite";

const { namehash, parseEther } = utils;

export function stakingPoolFactoryTests(): void {
  let stakingPoolFactory: StakingPoolFactory;
  let rewardPool: RewardPool;
  const service = "servicename";
  const sharing = 80;
  const serviceProviderRole = "serviceproviderrole";
  const version = 1;
  const serviceProvider = provider.getSigner(4);
  const principalThreshold = parseEther("0.1");

  async function setupContracts(
    { withdrawDelay = defaultWithdrawDelay }
      : { withdrawDelay?: number } = {}
  ) {
    rewardPool = await (await new RewardPool__factory(deployer).deploy()).deployed();
    stakingPoolFactory = await (await new StakingPoolFactory__factory(deployer).deploy(
      principalThreshold,
      namehash(serviceProviderRole),
      withdrawDelay,
      claimManager.address,
      ensRegistry.address,
      [namehash(patronRole)],
      rewardPool.address
    )).deployed();
  }

  async function registerService(): Promise<void> {
    await (await ensRegistry.setSubnodeOwner(root, hashLabel(service), await serviceProvider.getAddress())).wait();
    await (await ensRegistry.connect(serviceProvider).setResolver(namehash(service), roleResolver.address)).wait();
  }

  async function createServiceProviderRole(): Promise<void> {
    await (await ensRegistry.setSubnodeOwner(root, hashLabel(serviceProviderRole), await serviceProvider.getAddress())).wait();
    await (await ensRegistry.connect(serviceProvider).setResolver(namehash(serviceProviderRole), roleResolver.address)).wait();
    await (await serviceProvider.sendTransaction({
      ...roleFactory.newRole({
        domain: serviceProviderRole,
        roleDefinition: {
          roleName: serviceProviderRole,
          enrolmentPreconditions: [],
          fields: [],
          issuer: { issuerType: "DID", did: [`did:ethr:${await ewc.getAddress()}`] },
          metadata: [],
          roleType: "",
          version
        }
      })
    })).wait();
  }

  beforeEach(async () => {
    await setupContracts();
    await registerService();
    await createServiceProviderRole();
  });

  it("service owner can launch staking pool", async () => {
    await requestRole({ claimManager, roleName: serviceProviderRole, version, agreementSigner: serviceProvider, proofSigner: ewc });

    return expect(stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod,
      sharing,
      { value: parseEther("0.2") }
    )).fulfilled;
  });

  it("without having service provider role should not be able to launch pool", async () => {
    expect(await claimManager.hasRole(await serviceProvider.getAddress(), namehash(serviceProviderRole), 0)).false;

    return expect(stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod,
      sharing,
      { value: parseEther("0.2") }
    )).rejectedWith("StakingPoolFactory: service provider doesn't have required role");
  })
}