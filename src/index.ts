import { errors } from "ethers";
import { DomainReader } from "./DomainReader"
import { DomainTransactionFactory } from "./DomainTransactionFactory"
import { addKnownResolver, setRegistryAddress } from "./resolverConfig";
import { IOrganizationDefinition, IAppDefinition, IRoleDefinition, IRoleDefinitionText } from "./types/DomainDefinitions"
import { ResolverContractType } from "./types/ResolverContractType";
import { EncodedCall } from "./types/Transaction"

// To disable "WARNING: Multiple definitions for addr" that is triggered by ENS Registry
errors.setLogLevel("error");

export { DomainReader }
export { DomainTransactionFactory }
export { IOrganizationDefinition, IAppDefinition, IRoleDefinition, IRoleDefinitionText }
export { EncodedCall }
export { addKnownResolver, setRegistryAddress }
export { ResolverContractType }