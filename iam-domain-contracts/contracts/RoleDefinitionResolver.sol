pragma solidity 0.5.17;
pragma experimental ABIEncoderV2;

import "@ensdomains/ens/contracts/ENS.sol";
import "@ensdomains/resolver/contracts/PublicResolver.sol";
import "./profiles/enrolment-conditions/EnrolmentConditionTypeResolver.sol";
import "./profiles/enrolment-conditions/EnrolmentPrerequisiteRolesResolver.sol";
import "./profiles/issuance/IssuersResolver.sol";
import "./profiles/issuance/IssuerTypeResolver.sol";
import "./profiles/VersionNumberResolver.sol";

/**
 * An extension of the PublicResolver customized for RoleDefinitions
 */
contract RoleDefinitionResolver is
    PublicResolver,
    VersionNumberResolver,
    IssuerTypeResolver,
    IssuersResolver,
    EnrolmentConditionTypeResolver,
    EnrolmentPrerequisiteRolesResolver
{
    constructor(ENS _ens) public PublicResolver(_ens) {}
}
