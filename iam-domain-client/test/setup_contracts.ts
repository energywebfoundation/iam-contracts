import { Wallet, Contract, providers, utils } from "ethers";
import { ENSRegistry } from "../contract-types/ENSRegistry";
import { ENSRegistry__factory } from "../contract-types/factories/ENSRegistry__factory";
import { RoleDefinitionResolver } from "../contract-types/RoleDefinitionResolver";
import { RoleDefinitionResolver__factory } from "../contract-types/factories/RoleDefinitionResolver__factory";
import { PublicResolver } from "../contract-types/PublicResolver";
import { PublicResolver__factory } from "../contract-types/factories/PublicResolver__factory";
import { DomainNotifier } from "../contract-types/DomainNotifier";
import { DomainNotifier__factory } from "../contract-types/factories/DomainNotifier__factory";

const { JsonRpcProvider } = providers;
const { parseEther } = utils;

export const GANACHE_PORT = 8544;
export const provider = new JsonRpcProvider(`http://localhost:${GANACHE_PORT}`);
export let ensRegistry: ENSRegistry;
export let domainNotifier: DomainNotifier;
export let ensRoleDefResolver: RoleDefinitionResolver;
export let ensPublicResolver: PublicResolver;
export let didContract: Contract;

export const deployContracts = async (privateKey: string): Promise<void> => {
  const wallet = new Wallet(privateKey, provider);
  await replenish(wallet.address);
  ensRegistry = await (new ENSRegistry__factory(wallet).deploy());
  domainNotifier = await (new DomainNotifier__factory(wallet).deploy(ensRegistry.address));
  ensRoleDefResolver = await (new RoleDefinitionResolver__factory(wallet).deploy(ensRegistry.address, domainNotifier.address));
  ensPublicResolver = await (new PublicResolver__factory(wallet).deploy(ensRegistry.address));
};

export const replenish = async (acc: string) => {
  const faucet = provider.getSigner(2);
  await faucet.sendTransaction({
    to: acc,
    value: parseEther("1.0")
  });
};
