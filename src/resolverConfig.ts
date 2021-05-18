import { ResolverContractType } from "./types/ResolverContractType";

export const VOLTA_CHAIN_ID = 73799;
export const VOLTA_RESOLVER_V1_ADDRESS = '0x62147C885Bcadc3f505321aBe78d76FF08E7D38';
export const VOLTA_DOMAIN_NOTIFER_ADDRESS = '0x3d7a48FDcd5EF3c3c3e7620D516bE0FC62eDe14';
export const VOLTA_ENS_REGISTRY_ADDRESS = '0xd7CeF70Ba7efc2035256d828d5287e2D285CD1ac';

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