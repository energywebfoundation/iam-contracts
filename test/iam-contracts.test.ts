import { providers, ContractFactory, utils } from 'ethers';
import {
  abi as RoleDefAbi,
  bytecode as RoleDefBytecode,
} from '../build/contracts/RoleDefinitionResolver.json';
import {
  abi as PublicResolverAbi,
  bytecode as PublicResolverBytecode,
} from '../build/contracts/PublicResolver.json';
import {
  abi as DomainNotifierAbi,
  bytecode as DomainNotiferBytecode,
} from '../build/contracts/DomainNotifier.json';
import {
  abi as ensAbi,
  bytecode as ensBytecode,
} from '@ensdomains/ens-contracts/artifacts/contracts/registry/ENSRegistry.sol/ENSRegistry.json';
import { roleDefinitionResolverTestSuite } from './RoleDefinitionResolver.testSuite';
import { domainCrudTestSuite } from './DomainCRUD.testSuite';
import { domainHierarchyTestSuite } from './DomainHierarchy.testSuite';
import { claimManagerTests } from './ClaimManagerTests/ClaimManager.testSuite';
import { revocationRegistryTests } from './RevocationRegistry.testSuite';
import { domainCrudTestSuiteWithRevocation } from './DomainCRUD.testSuiteV2';

const { JsonRpcProvider } = providers;

export const hashLabel = (label: string): string =>
  utils.keccak256(utils.toUtf8Bytes(label));

describe('[IAM CONTRACTS]', function () {
  this.timeout(0);
  const provider = new JsonRpcProvider('http://localhost:8544');
  const deployer = provider.getSigner(1);

  before(async function () {
    const owner = provider.getSigner(1);
    const anotherAccount = provider.getSigner(2);

    const publicResolverFactory = new ContractFactory(
      PublicResolverAbi,
      PublicResolverBytecode,
      deployer
    );
    const roleDefResolverFactory = new ContractFactory(
      RoleDefAbi,
      RoleDefBytecode,
      deployer
    );
    const ensFactory = new ContractFactory(ensAbi, ensBytecode, deployer);
    const domainNotifierFactory = new ContractFactory(
      DomainNotifierAbi,
      DomainNotiferBytecode,
      deployer
    );

    const { chainId } = await provider.getNetwork();

    Object.assign(this, {
      publicResolverFactory,
      roleDefResolverFactory,
      ensFactory,
      domainNotifierFactory,
      owner,
      anotherAccount,
      provider,
      chainId,
    });
  });

  describe('RoleDefinitionResolver Test', roleDefinitionResolverTestSuite);
  describe('DomainCRUD Test', domainCrudTestSuite);
  describe(
    'DomainCRUD Test with Revocation feature',
    domainCrudTestSuiteWithRevocation
  );
  describe('DomainHierarchy Test', domainHierarchyTestSuite);
  describe('ClaimManager Test', claimManagerTests);
  describe('Revocation Test', revocationRegistryTests);
});
