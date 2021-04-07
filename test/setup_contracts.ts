import { Contract, providers, ContractFactory } from "ethers";
import { ENSRegistry } from "../typechain/ENSRegistry";
import { RoleDefinitionResolver } from "../typechain/RoleDefinitionResolver";
import { DomainNotifier } from "../typechain/DomainNotifier";
import { PublicResolver } from "../typechain/PublicResolver";
import { abi as RoleDefAbi, bytecode as RoleDefBytecode } from '../build/contracts/RoleDefinitionResolver.json';
import { abi as DomainNotifierAbi, bytecode as DomainNotiferBytecode } from '../build/contracts/DomainNotifier.json';
import { abi as ensAbi, bytecode as ensBytecode } from '@ensdomains/ens/build/contracts/ENSRegistry.json';

const { JsonRpcProvider } = providers;

export const GANACHE_PORT = 8544;
export const provider = new JsonRpcProvider(`http://localhost:${GANACHE_PORT}`);
export let ensRegistry: ENSRegistry;
export let domainNotifier: DomainNotifier;
export let ensRoleDefResolver: RoleDefinitionResolver;
export let ensPublicResolver: PublicResolver;
export let didContract: Contract;

const deployer = provider.getSigner(1);

const roleDefResolverFactory = new ContractFactory(RoleDefAbi, RoleDefBytecode, deployer);
const ensFactory = new ContractFactory(ensAbi, ensBytecode, deployer);
const domainNotifierFactory = new ContractFactory(DomainNotifierAbi, DomainNotiferBytecode, deployer);

export const deployContracts = async (): Promise<void> => {
  ensRegistry = await ensFactory.deploy() as ENSRegistry;
  await ensRegistry.deployed();
  domainNotifier = await domainNotifierFactory.deploy(ensRegistry.address) as DomainNotifier;
  await domainNotifier.deployed();
  ensRoleDefResolver = await roleDefResolverFactory.deploy(ensRegistry.address, domainNotifier.address) as RoleDefinitionResolver;
  await ensRoleDefResolver.deployed();
};
