import { utils } from "ethers";
import { DomainReader } from "./DomainReader";
import { DomainTransactionFactory } from "./DomainTransactionFactory";
import { DomainHierarchy } from "./DomainHierarchy";
import {
  IAppDefinition,
  IOrganizationDefinition,
  IRoleDefinition,
  IRoleDefinitionText,
  PreconditionType,
} from "./types/DomainDefinitions";
import { ResolverContractType } from "./types/ResolverContractType";
import { EncodedCall } from "./types/Transaction";

// To disable "WARNING: Multiple definitions for addr" that is triggered by ENS Registry
const { Logger } = utils;
Logger.setLogLevel(Logger.levels.ERROR);

export { DomainReader };
export { DomainTransactionFactory };
export {
  IOrganizationDefinition,
  IAppDefinition,
  IRoleDefinition,
  IRoleDefinitionText,
  PreconditionType,
};
export { EncodedCall };
export * from "./chainConstants";
export { PRINCIPAL_THRESHOLD, WITHDRAW_DELAY } from "./constants";
export { ResolverContractType };
export { DomainHierarchy };
