import { Contract, ContractFactory, EventFilter, Signer, Wallet } from "ethers";
import { JsonRpcProvider } from "ethers/providers";
import { utils } from "ethers";
import { ClaimManager } from "../../ethers-v4/ClaimManager";
import { ENSRegistry } from "../../ethers-v4/ENSRegistry";
import { DomainTransactionFactory, ENSRegistry__factory, DomainNotifier__factory, RoleDefinitionResolver__factory, ClaimManager__factory, StakingPoolFactory__factory } from "../../src";
import { abi as erc1056Abi, bytecode as erc1056Bytecode } from "../test_utils/ERC1056.json";
import { hashLabel } from "../iam-contracts.test";
import { stakingPoolTests } from "./StakingPool.testSuite";
import { stakingPoolFactoryTests } from "./stakingPoolFactory.testSuite";
import { RoleDefinitionResolver } from "../../ethers-v4/RoleDefinitionResolver";
import { StakingPoolFactory } from "../../ethers-v4/StakingPoolFactory";
import { rewardPoolTests } from "./RewardPool.testSuite";

export const provider = new JsonRpcProvider("http://localhost:8544");
export const deployer = provider.getSigner(1);
export const ewc = provider.getSigner(2);
const faucet = provider.getSigner(9);

export const minStakingPeriod = 1;
export const withdrawDelay = 1;

export let claimManager: ClaimManager;
export let roleFactory: DomainTransactionFactory;
export let roleResolver: RoleDefinitionResolver;
export let ensRegistry: ENSRegistry;

export const root = `0x${"0".repeat(64)}`;
export const patronRole = "patron";

export const waitFor = (filter: EventFilter, contract: Contract): Promise<void> => new Promise((resolve) => {
  contract.addListener(filter, resolve)
})
  .then(() => {
    contract.removeAllListeners(filter);
  });

export const getSigner = async (): Promise<Signer> => {
  const signer = Wallet.createRandom().connect(provider);
  await faucet.sendTransaction({ to: await signer.getAddress(), value: parseEther('1') });
  return signer;
}

async function setupContracts(): Promise<void> {
  const deployerAddr = await deployer.getAddress();
  const erc1056Factory = new ContractFactory(erc1056Abi, erc1056Bytecode, deployer);
  const erc1056 = await (await erc1056Factory.deploy()).deployed();
  ensRegistry = await (await new ENSRegistry__factory(deployer).deploy()).deployed();
  const notifier = await (await new DomainNotifier__factory(deployer).deploy(ensRegistry.address)).deployed();
  roleResolver = await (await (new RoleDefinitionResolver__factory(deployer).deploy(ensRegistry.address, notifier.address))).deployed();
  claimManager = await (await new ClaimManager__factory(deployer).deploy(erc1056.address, ensRegistry.address)).deployed();
  roleFactory = new DomainTransactionFactory({ domainResolverAddress: roleResolver.address });

  await (await ensRegistry.setSubnodeOwner(root, hashLabel(patronRole), deployerAddr)).wait();
  await (await ensRegistry.setResolver(namehash(patronRole), roleResolver.address)).wait();

  await (await deployer.sendTransaction({
    ...roleFactory.newRole({
      domain: patronRole,
      roleDefinition: {
        roleName: patronRole,
        enrolmentPreconditions: [],
        fields: [],
        issuer: { issuerType: "DID", did: [`did:ethr:${await ewc.getAddress()}`] },
        metadata: [],
        roleType: "",
        version: 1
      }
    })
  })).wait();
}

const { namehash, parseEther } = utils;

export let stakingPoolFactory: StakingPoolFactory;
export let serviceProvider: Signer;
export const principalThreshold = parseEther("0.1");
export const org = "orgname";

export function stakingTests(): void {

  async function setupStakingPoolFactory() {
    stakingPoolFactory = await (await new StakingPoolFactory__factory(deployer).deploy(
      principalThreshold,
      withdrawDelay,
      claimManager.address,
      ensRegistry.address,
    )).deployed();
  }

  async function registerServiceWithProvider(): Promise<void> {
    await (await ensRegistry.setSubnodeOwner(root, hashLabel(org), await serviceProvider.getAddress())).wait();
    await (await ensRegistry.connect(serviceProvider).setResolver(namehash(org), roleResolver.address)).wait();
  }
  beforeEach(async function () {
    await setupContracts();
    serviceProvider = await getSigner();

    await setupStakingPoolFactory();
    await registerServiceWithProvider();
  });

  describe("Staking pool tests", stakingPoolTests);
  describe("Staking pool factory tests", stakingPoolFactoryTests);
  describe("Reward pool tests", rewardPoolTests);
}