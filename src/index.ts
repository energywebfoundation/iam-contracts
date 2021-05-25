import { errors } from "ethers";
import { DomainReader } from "./DomainReader"
import { DomainTransactionFactory } from "./DomainTransactionFactory"
import { DomainHierarchy } from "./DomainHierarchy"
import { VOLTA_CHAIN_ID, VOLTA_DOMAIN_NOTIFER_ADDRESS, VOLTA_ENS_REGISTRY_ADDRESS, VOLTA_PUBLIC_RESOLVER_ADDRESS, VOLTA_RESOLVER_V1_ADDRESS } from "./chainConstants";
import { IAppDefinition, IOrganizationDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType } from "./types/DomainDefinitions"
import { ResolverContractType } from "./types/ResolverContractType";
import { EncodedCall } from "./types/Transaction"

// To disable "WARNING: Multiple definitions for addr" that is triggered by ENS Registry
errors.setLogLevel("error");

export { DomainReader }
export { DomainTransactionFactory }
export { IOrganizationDefinition, IAppDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType }
export { EncodedCall }
export { VOLTA_CHAIN_ID, VOLTA_PUBLIC_RESOLVER_ADDRESS, VOLTA_RESOLVER_V1_ADDRESS, VOLTA_DOMAIN_NOTIFER_ADDRESS, VOLTA_ENS_REGISTRY_ADDRESS }
export { ResolverContractType }
export { DomainHierarchy }