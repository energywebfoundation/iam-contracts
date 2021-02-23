pragma solidity 0.5.17;
pragma experimental ABIEncoderV2;

import "@ensdomains/ens/contracts/ENS.sol";
import "@ensdomains/resolver/contracts/PublicResolver.sol";
import "./profiles/IssuersResolver.sol";

/**
 * An extension of the PublicResolver customized RoleDefinitions
 */
contract RoleDefinitionResolver is PublicResolver, IssuersResolver {
    constructor(ENS _ens) public PublicResolver(_ens) {}
}
