import { expect } from "chai";
import { Signer, utils, Wallet } from "ethers";
import { RewardPool } from "../../ethers-v4/RewardPool";
import { StakingPoolFactory } from "../../ethers-v4/StakingPoolFactory";
import { RewardPool__factory, StakingPoolFactory__factory } from "../../src";
import { hashLabel } from "../iam-contracts.test";
import { requestRole } from "../test_utils/role_utils";
import { ensRegistry, patronRole, deployer, ewc, root, roleResolver, roleFactory, defaultMinStakingPeriod, claimManager, defaultWithdrawDelay, provider } from "./staking.testSuite";

const { namehash, parseEther, formatEther } = utils;

export function stakingPoolFactoryTests(): void {
  let stakingPoolFactory: StakingPoolFactory;
  let rewardPool: RewardPool;
  const service = "servicename";
  const sharing = 80;
  const serviceProviderRole = "serviceproviderrole";
  const version = 1;
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
      namehash(serviceProviderRole),
      withdrawDelay,
      claimManager.address,
      ensRegistry.address,
      [namehash(patronRole)],
      rewardPool.address
    )).deployed();
  }

  async function registerServiceWithProvider(): Promise<void> {
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
    serviceProvider = await getSigner();

    await setupContracts();
    await registerServiceWithProvider();
    await createServiceProviderRole();
  });

  it("service owner can launch staking pool", async () => {
    await requestRole({ claimManager, roleName: serviceProviderRole, version, agreementSigner: serviceProvider, proofSigner: ewc });

    return expect(stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod,
      sharing,
      { value: principalThreshold.mul(2) }
    )).fulfilled;
  });

  it("without having service provider role should not be able to launch pool", async () => {
    expect(await claimManager.hasRole(await serviceProvider.getAddress(), namehash(serviceProviderRole), 0)).false;

    return expect(stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod,
      sharing,
      { value: principalThreshold.mul(2) }
    )).rejectedWith("StakingPoolFactory: service provider doesn't have required role");
  });

  it('non owner of service should not be able to launch pool', async () => {
    const nonOwner = await getSigner();
    await requestRole({ claimManager, roleName: serviceProviderRole, version, agreementSigner: nonOwner, proofSigner: ewc });

    return expect(stakingPoolFactory.connect(nonOwner).launchStakingPool(
      namehash(service),
      defaultMinStakingPeriod,
      sharing,
      { value: principalThreshold.mul(2) }
    )).rejectedWith("StakingPoolFactory: Not authorized to create pool for services in this domain");
  });
}