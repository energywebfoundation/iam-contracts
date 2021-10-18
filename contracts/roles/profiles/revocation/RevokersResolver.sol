pragma solidity ^0.8.0;

import "@ensdomains/ens-contracts/contracts/resolvers/ResolverBase.sol";

/**
 * Profile for resolving identities (by did or by role) which can revoke a role definition
 */
abstract contract RevokersResolver is ResolverBase {
    bytes4 private constant REVOKERS_INTERFACE_ID = 0x74d3013a;

    struct Revokers {
        address[] dids;
        bytes32 role;
    }

    event RevokersChanged(bytes32 indexed node, Revokers newRevokers);

    mapping(bytes32 => Revokers) revokersMap;

    /**
     * Sets the dids associated with a role.
     * Clears the role associated with a role.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param dids The dids to set.
     */
    function setRevokerDids(bytes32 node, address[] calldata dids)
        external
        authorised(node)
    {
        revokersMap[node].dids = dids;
        delete revokersMap[node].role;
        emit RevokersChanged(node, revokersMap[node]);
    }

    /**
     * Sets the dids associated with a role.
     * Clears the role associated with a role.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param role The role to set.
     */
    function setRevokerRole(bytes32 node, bytes32 role)
        external
        authorised(node)
    {
        revokersMap[node].role = role;
        delete revokersMap[node].dids;
        emit RevokersChanged(node, revokersMap[node]);
    }

    /**
     * Returns the revokers associated with an ENS node.
     * @param node The ENS node to query.
     * @return dids or role of eligible revokers.
     */
    function revokers(bytes32 node)
        external
        view
        returns (address[] memory dids, bytes32 role)
    {
        return (revokersMap[node].dids, revokersMap[node].role);
    }

    function supportsInterface(bytes4 interfaceID)
        public
        pure
        virtual
        override
        returns (bool)
    {
        return
            interfaceID == REVOKERS_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
