import { errors } from "ethers";
import { DomainReader } from "./DomainReader"
import { DomainTransactionFactory } from "./DomainTransactionFactory"
import { DomainHierarchy } from "./DomainHierarchy"
import { VOLTA_CHAIN_ID, VOLTA_DOMAIN_NOTIFER_ADDRESS, VOLTA_ENS_REGISTRY_ADDRESS, VOLTA_PUBLIC_RESOLVER_ADDRESS, VOLTA_RESOLVER_V1_ADDRESS } from "./chainConstants";
import { IAppDefinition, IOrganizationDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType } from "./types/DomainDefinitions"
import { ResolverContractType } from "./types/ResolverContractType";
import { EncodedCall } from "./types/Transaction"
import { DomainNotifier__factory } from "../ethers-v4/factories/DomainNotifier__factory"
import { ENSRegistry__factory } from "../ethers-v4/factories/ENSRegistry__factory"
import { PublicResolver__factory } from "../ethers-v4/factories/PublicResolver__factory"
import { RoleDefinitionResolver__factory } from "../ethers-v4/factories/RoleDefinitionResolver__factory"

// To disable "WARNING: Multiple definitions for addr" that is triggered by ENS Registry
errors.setLogLevel("error");

export { DomainReader }
export { DomainTransactionFactory }
export { IOrganizationDefinition, IAppDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType }
export { EncodedCall }
export { VOLTA_CHAIN_ID, VOLTA_PUBLIC_RESOLVER_ADDRESS, VOLTA_RESOLVER_V1_ADDRESS, VOLTA_DOMAIN_NOTIFER_ADDRESS, VOLTA_ENS_REGISTRY_ADDRESS }
export { ResolverContractType }
export { DomainHierarchy }
export { DomainNotifier__factory, ENSRegistry__factory, PublicResolver__factory, RoleDefinitionResolver__factory }