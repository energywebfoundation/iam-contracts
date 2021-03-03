pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@ensdomains/resolver/contracts/ResolverBase.sol";

/**
 * Profile for resolving version number of role definition.
 */
contract VersionNumberResolver is ResolverBase {
    bytes4 private constant VERSION_NUMBER_INTERFACE_ID = 0x338bc8fa;

    event VersionNumberChanged(bytes32 indexed node, uint16 newVersion);

    mapping(bytes32 => uint16) public versionNumbers;

    /**
     * Sets the version number associated with a role def.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param versionNumber The versionNumber to set.
     */
    function setVersionNumber(bytes32 node, uint16 versionNumber)
        external
        authorised(node)
    {
        versionNumbers[node] = versionNumber;
        emit VersionNumberChanged(node, versionNumbers[node]);
    }

    /**
     * Returns the version number associated with a role def.
     * @param node The ENS node to query.
     * @return The associated version number.
     */
    function versionNumber(bytes32 node) external view returns (uint16) {
        return (versionNumbers[node]);
    }

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return
            interfaceID == VERSION_NUMBER_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
