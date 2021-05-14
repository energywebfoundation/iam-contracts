pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@ensdomains/resolver/contracts/ResolverBase.sol";

/**
 * Profile for resolving version number of role definition.
 */
abstract contract VersionNumberResolver is ResolverBase {
    bytes4 private constant VERSION_NUMBER_INTERFACE_ID = 0x338bc8fa;

    event VersionNumberChanged(bytes32 indexed node, string newVersion);

    mapping(bytes32 => string) public versionNumbers;

    /**
     * Sets the version number associated with a role def.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param newVersionNumber The versionNumber to set.
     */
    function setVersionNumber(bytes32 node, string calldata newVersionNumber)
        external
        authorised(node)
    {
        versionNumbers[node] = newVersionNumber;
        emit VersionNumberChanged(node, versionNumbers[node]);
    }

    /**
     * Returns the version number associated with a role def.
     * @param node The ENS node to query.
     * @return The associated version number.
     */
    function versionNumber(bytes32 node) external view returns (string memory) {
        return (versionNumbers[node]);
    }

    function supportsInterface(bytes4 interfaceID)
        public
        pure
        virtual
        override
        returns (bool)
    {
        return
            interfaceID == VERSION_NUMBER_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
