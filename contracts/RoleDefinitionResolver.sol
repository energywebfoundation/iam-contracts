pragma solidity 0.5.17;
pragma experimental ABIEncoderV2;

import "@ensdomains/ens/contracts/ENS.sol";
import "@ensdomains/resolver/contracts/PublicResolver.sol";
import "./profiles/IssuersResolver.sol";
import "./profiles/VersionNumberResolver.sol";
import "./profiles/IssuerTypeResolver.sol";

/**
 * An extension of the PublicResolver customized for RoleDefinitions
 */
contract RoleDefinitionResolver is
    PublicResolver,
    IssuersResolver,
    VersionNumberResolver,
    IssuerTypeResolver
{
    constructor(ENS _ens) public PublicResolver(_ens) {}
}
