pragma solidity ^0.8.0;

import "@ensdomains/ens-contracts/contracts/resolvers/ResolverBase.sol";

/**
 * Profile for resolving version number of role definition.
 */
abstract contract VersionNumberResolver is ResolverBase {
    bytes4 private constant VERSION_NUMBER_INTERFACE_ID = 0x338bc8fa;

    event VersionNumberChanged(bytes32 indexed node, uint256 newVersion);

    mapping(bytes32 => uint256) public versionNumbers;

    /**
     * Sets the version number associated with a role def.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param newVersionNumber The versionNumber to set.
     */
    function setVersionNumber(bytes32 node, uint256 newVersionNumber)
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
    function versionNumber(bytes32 node) external view returns (uint256) {
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
