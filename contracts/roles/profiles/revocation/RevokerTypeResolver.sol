pragma solidity ^0.8.0;

import "@ensdomains/ens-contracts/contracts/resolvers/ResolverBase.sol";

/**
 * Profile for resolving type of revocation expect for a role.
 * The types are mutually exclusive. A role can only have a single type at a time.
 * These possible types are:
 * 00: Revocations allowed for some identity (i.e. an identity from a list of DIDs, or an identity with a given role)
 * 10: “Real-time” revocation by a smart contract.
 */
abstract contract RevokerTypeResolver is ResolverBase {
    bytes4 private constant REVOKER_TYPE_INTERFACE_ID = 0xec7adf27;

    event RevokerTypeChanged(bytes32 indexed node, uint8 newType);

    // uint used instead of enum so that new types can be added without needing to update the resolver
    mapping(bytes32 => uint8) public revokerTypes;

    /**
     * Sets the revokerType associated with a role def.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param newRevokerType The revokerType to set.
     */
    function setRevokerType(bytes32 node, uint8 newRevokerType)
        external
        authorised(node)
    {
        revokerTypes[node] = newRevokerType;
        emit RevokerTypeChanged(node, revokerTypes[node]);
    }

    /**
     * Returns the revokerType associated with a role def.
     * @param node The ENS node to query.
     * @return The associated revoker type.
     */
    function revokerType(bytes32 node) external view returns (uint8) {
        return (revokerTypes[node]);
    }

    function supportsInterface(bytes4 interfaceID)
        public
        pure
        virtual
        override
        returns (bool)
    {
        return
            interfaceID == REVOKER_TYPE_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
