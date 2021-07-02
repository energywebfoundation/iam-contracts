import { errors } from "ethers";
import { DomainReader } from "./DomainReader"
import { DomainTransactionFactory } from "./DomainTransactionFactory"
import { DomainHierarchy } from "./DomainHierarchy"
import { IAppDefinition, IOrganizationDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType } from "./types/DomainDefinitions"
import { ResolverContractType } from "./types/ResolverContractType";
import { EncodedCall } from "./types/Transaction"
import { DomainNotifier__factory } from "../ethers-v4/factories/DomainNotifier__factory"
import { ENSRegistry__factory } from "../ethers-v4/factories/ENSRegistry__factory"
import { PublicResolver__factory } from "../ethers-v4/factories/PublicResolver__factory"
import { RoleDefinitionResolver__factory } from "../ethers-v4/factories/RoleDefinitionResolver__factory"
import { ClaimManager__factory } from "../ethers-v4/factories/ClaimManager__factory"
import { StakingPool__factory } from "../ethers-v4/factories/StakingPool__factory"
import { StakingPoolFactory__factory } from "../ethers-v4/factories/StakingPoolFactory__factory"
import { RewardPool__factory } from "../ethers-v4/factories/RewardPool__factory"

// To disable "WARNING: Multiple definitions for addr" that is triggered by ENS Registry
errors.setLogLevel("error");

export { DomainReader }
export { DomainTransactionFactory }
export { IOrganizationDefinition, IAppDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType }
export { EncodedCall }
export * from "./chainConstants";
export { ResolverContractType }
export { DomainHierarchy }
export {
  DomainNotifier__factory,
  ENSRegistry__factory,
  PublicResolver__factory,
  RoleDefinitionResolver__factory,
  ClaimManager__factory,
  StakingPool__factory,
  StakingPoolFactory__factory,
  RewardPool__factory
}