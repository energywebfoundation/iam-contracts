import { providers, ContractFactory } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/utils';
import { abi as RoleDefAbi, bytecode as RoleDefBytecode } from '../build/contracts/RoleDefinitionResolver.json';
import { abi as PublicResolverAbi, bytecode as PublicResolverBytecode } from '../build/contracts/PublicResolver.json';
import { abi as DomainNotifierAbi, bytecode as DomainNotiferBytecode } from '../build/contracts/DomainNotifier.json';
import { abi as ensAbi, bytecode as ensBytecode } from '@ensdomains/ens/build/contracts/ENSRegistry.json';
import { roleDefinitionResolverTestSuite } from './RoleDefinitionResolver.testSuite';
import { domainCrudTestSuite } from './DomainCRUD.testSuite';
import { getSubDomainsTestSuite } from './getSubDomains.testSuite';

const { JsonRpcProvider } = providers;

export const hashLabel = (label: string): string => keccak256(toUtf8Bytes(label));

describe('[IAM CONTRACTS]', function () {
  this.timeout(0);
  const provider = new JsonRpcProvider('http://localhost:8544');
  const deployer = provider.getSigner(1);

  before(async function () {
    const owner = provider.getSigner(1);
    const anotherAccount = provider.getSigner(2);

    const publicResolverFactory = new ContractFactory(PublicResolverAbi, PublicResolverBytecode, deployer);
    const roleDefResolverFactory = new ContractFactory(RoleDefAbi, RoleDefBytecode, deployer);
    const ensFactory = new ContractFactory(ensAbi, ensBytecode, deployer);
    const domainNotifierFactory = new ContractFactory(DomainNotifierAbi, DomainNotiferBytecode, deployer);

    Object.assign(this, {
      publicResolverFactory, roleDefResolverFactory, ensFactory, domainNotifierFactory, owner, anotherAccount, provider,
    });
  });

  describe('RoleDefinitionResolver Test', roleDefinitionResolverTestSuite);
  describe('DomainCRUD Test', domainCrudTestSuite);
  describe('getSubDomains Test', getSubDomainsTestSuite);
});