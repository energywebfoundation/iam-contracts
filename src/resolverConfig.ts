import { ResolverContractType } from "./types/ResolverContractType";

export const VOLTA_CHAIN_ID = 73799;

export const ensRegistryAddresses: Record<number, string> = {
  [VOLTA_CHAIN_ID]: '0xd7CeF70Ba7efc2035256d828d5287e2D285CD1ac'
};

export function setRegistryAddress({ chainId, address }: { chainId: number, address: string }): void {
  ensRegistryAddresses[chainId] = address;
}

export const knownEnsResolvers: Record<number, Record<string, ResolverContractType>> = {
  [VOLTA_CHAIN_ID]: {
    '0x0a97e07c4Df22e2e31872F20C5BE191D5EFc4680': ResolverContractType.PublicResolver,
    '0x62147C885Bcadc3f505321aBe78d76FF08E7D38': ResolverContractType.RoleDefinitionResolver_v1
  }
};

export function addKnownResolver({ chainId, address, type }: { chainId: number, address: string, type: ResolverContractType }): void {
  if (!knownEnsResolvers[chainId]) {
    knownEnsResolvers[chainId] = {}
  }
  knownEnsResolvers[chainId][address] = type;
}

type EnumDictionary<T extends string, U> = {
  [K in T]?: U;
};

const primaryResolvers: Record<number, EnumDictionary<ResolverContractType, string>> = {
  [VOLTA_CHAIN_ID]: {
    [ResolverContractType.RoleDefinitionResolver_v1]: '0x62147C885Bcadc3f505321aBe78d76FF08E7D38',
    [ResolverContractType.PublicResolver]: '0x0a97e07c4Df22e2e31872F20C5BE191D5EFc4680',
  }
};

export function getPrimaryResolver(chainId: number, type: ResolverContractType): string | undefined {
  return primaryResolvers[chainId][type]
}

export function setPrimaryResolver({ chainId, type, address }: { chainId: number, type: ResolverContractType, address: string }): void {
  if (!primaryResolvers[chainId]) {
    primaryResolvers[chainId] = {}
  }
  primaryResolvers[chainId][type] = address;
}

const domainNotifiers: Record<number, string> = {
  [VOLTA_CHAIN_ID]: '0x3d7a48FDcd5EF3c3c3e7620D516bE0FC62eDe14',
}

export function getDomainNotifer(chainId: number): string | undefined {
  return domainNotifiers[chainId]
}

export function setDomainNotifier({ chainId, address }: { chainId: number, address: string }): void {
  domainNotifiers[chainId] = address
}