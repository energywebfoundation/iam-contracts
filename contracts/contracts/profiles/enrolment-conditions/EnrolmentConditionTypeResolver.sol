pragma solidity ^0.5.0;

import "@ensdomains/resolver/contracts/ResolverBase.sol";

/**
 * Profile for resolving type of conditions required for an identity to be eligible for a role.
 * A role can require a combination of the types.
 * These possible types are:
 * 00: The requesting identity must have some role
 */
contract EnrolmentConditionTypeResolver is ResolverBase {
    bytes4 private constant ENROLMENT_CONDITION_TYPE_INTERFACE_ID = 0xafe767c6;

    event EnrolmentConditionTypeAdded(bytes32 indexed node, uint256 addedType);
    event EnrolmentConditionTypeRemoved(
        bytes32 indexed node,
        uint256 removedType
    );

    mapping(bytes32 => mapping(uint256 => bool)) public conditionTypes;

    /**
     * Adds a conditionType required for a role.
     * If type is already required for a role, no action is taken.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param conditionType The conditionType to add.
     */
    function addConditionType(bytes32 node, uint256 conditionType)
        external
        authorised(node)
    {
        if (conditionTypes[node][conditionType] == false) {
            conditionTypes[node][conditionType] = true;
            emit EnrolmentConditionTypeAdded(node, conditionType);
        }
    }

    /**
     * Removes a conditionType required for a role.
     * If type is already not required for a role, no action is taken.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param conditionType The conditionType to add.
     */
    function removeConditionType(bytes32 node, uint256 conditionType)
        external
        authorised(node)
    {
        if (conditionTypes[node][conditionType] == true) {
            conditionTypes[node][conditionType] = false;
            emit EnrolmentConditionTypeRemoved(node, conditionType);
        }
    }

    /**
     * Returns whether or not a condition type is required for a role
     * @param node The ENS node to query.
     * @param condition The condition to check
     * @return Whether or not the role requires this condition
     */
    function requiresConditionType(bytes32 node, uint256 condition)
        external
        view
        returns (bool)
    {
        return (conditionTypes[node][condition]);
    }

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return
            interfaceID == ENROLMENT_CONDITION_TYPE_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
