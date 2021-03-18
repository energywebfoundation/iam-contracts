import { ContractFactory, Wallet, Contract, providers, utils } from "ethers";
import { ENSRegistry } from "../ethers/ENSRegistry";
import { ENSRegistry__factory } from "../ethers/factories/ENSRegistry__factory";
import { RoleDefinitionResolver } from "../ethers/RoleDefinitionResolver";
import { RoleDefinitionResolver__factory } from "../ethers/factories/RoleDefinitionResolver__factory";

const { JsonRpcProvider } = providers;
const { parseEther } = utils;

export const GANACHE_PORT = 8544;
export const provider = new JsonRpcProvider(`http://localhost:${GANACHE_PORT}`);
export let ensRegistry: ENSRegistry;
export let ensRoleDefResolver: RoleDefinitionResolver;
export let didContract: Contract;

export const deployContracts = async (privateKey: string): Promise<void> => {
  const wallet = new Wallet(privateKey, provider);
  await replenish(wallet.address);
  ensRegistry = await (new ENSRegistry__factory(wallet).deploy());
  ensRoleDefResolver = await (new RoleDefinitionResolver__factory(wallet).deploy(ensRegistry.address));
};

export const replenish = async (acc: string) => {
  const faucet = provider.getSigner(2);
  await faucet.sendTransaction({
    to: acc,
    value: parseEther("1.0")
  });
};
