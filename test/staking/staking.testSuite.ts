import { Contract, ContractFactory, EventFilter } from "ethers";
import { JsonRpcProvider } from "ethers/providers";
import { namehash } from "ethers/utils";
import { ClaimManager } from "../../ethers-v4/ClaimManager";
import { ENSRegistry } from "../../ethers-v4/ENSRegistry";
import { DomainTransactionFactory, ENSRegistry__factory, DomainNotifier__factory, RoleDefinitionResolver__factory, ClaimManager__factory } from "../../src";
import { abi as erc1056Abi, bytecode as erc1056Bytecode } from "../test_utils/ERC1056.json";
import { hashLabel } from "../iam-contracts.test";
import { stakingPoolTests } from "./StakingPool.testSuite";
import { stakingPoolFactoryTests } from "./stakingPoolFactory.testSuite";
import { RoleDefinitionResolver } from "../../ethers-v4/RoleDefinitionResolver";

export const provider = new JsonRpcProvider("http://localhost:8544");
export const deployer = provider.getSigner(1);
export const ewc = provider.getSigner(2);
export const patron = provider.getSigner(3);

export const defaultMinStakingPeriod = 60 * 60 * 24;
export const defaultWithdrawDelay = 60 * 60;

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

export function stakingTests(): void {
  beforeEach(async function () {
    await setupContracts();
  });

  describe("Staking pool tests", stakingPoolTests);
  describe.only("Staking pool factory tests", stakingPoolFactoryTests);
}