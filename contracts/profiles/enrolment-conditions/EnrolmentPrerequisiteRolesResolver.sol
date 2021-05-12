pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@ensdomains/resolver/contracts/ResolverBase.sol";

/**
 * Profile for resolving roles which an identity must have to be eligible for a role claim
 */
contract EnrolmentPrerequisiteRolesResolver is ResolverBase {
    bytes4 private constant PREREQUISITE_ROLES_INTERFACE_ID = 0xc986c404;

    struct PrerequisiteRoles {
        bytes32[] roles;
        bool mustHaveAll;
    }

    event PrerequisiteRolesChanged(
        bytes32 indexed node,
        PrerequisiteRoles newPrerequisiteRoles
    );

    mapping(bytes32 => PrerequisiteRoles) prerequisiteRolesMap;

    /**
     * Sets the prerequisite role required to be eligible for a role claim.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param roles The prerequisite roles to set.
     */
    function setPrerequisiteRoles(
        bytes32 node,
        bytes32[] calldata roles,
        bool mustHaveAll
    ) external authorised(node) {
        prerequisiteRolesMap[node] = PrerequisiteRoles(roles, mustHaveAll);
        emit PrerequisiteRolesChanged(node, prerequisiteRolesMap[node]);
    }

    /**
     * Returns the prerequisite roles required to be eligible for a role claim.
     * @param node The ENS node to query.
     * @return The prequisite roles.
     */
    function prerequisiteRoles(bytes32 node)
        external
        view
        returns (bytes32[] memory roles, bool mustHaveAll)
    {
        return (
            prerequisiteRolesMap[node].roles,
            prerequisiteRolesMap[node].mustHaveAll
        );
    }

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return
            interfaceID == PREREQUISITE_ROLES_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
