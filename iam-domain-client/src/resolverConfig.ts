import { ResolverContractType } from "./types/ResolverContractType";

export const VOLTA_CHAIN_ID = 73799;

export const ensRegistryAddresses: Record<number, string> = {
  [VOLTA_CHAIN_ID]: '0xd7CeF70Ba7efc2035256d828d5287e2D285CD1ac'
};

export function setRegistryAddress(chainId: number, address: string) {
  ensRegistryAddresses[chainId] = address;
}

export const knownEnsResolvers: Record<number, Record<string, ResolverContractType>> = {
  [VOLTA_CHAIN_ID]: {
    ['0x0a97e07c4Df22e2e31872F20C5BE191D5EFc4680']: ResolverContractType.PublicResolver
  }
};

export function addKnownResolver(chainId: number, address: string, type: ResolverContractType) {
  knownEnsResolvers[chainId][address] = type;
}

