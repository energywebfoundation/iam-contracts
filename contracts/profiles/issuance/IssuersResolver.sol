pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@ensdomains/resolver/contracts/ResolverBase.sol";

/**
 * Profile for resolving identities (by did or by role) which can issue a role definition
 */
contract IssuersResolver is ResolverBase {
    bytes4 private constant ISSUERS_INTERFACE_ID = 0xc53a4413;

    struct Issuers {
        address[] dids;
        bytes32 role;
    }

    event IssuersChanged(bytes32 indexed node, Issuers newIssuers);

    mapping(bytes32 => Issuers) issuersMap;

    /**
     * Sets the dids associated with a role.
     * Clears the role associated with a role.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param dids The dids to set.
     */
    function setIssuerDids(bytes32 node, address[] calldata dids)
        external
        authorised(node)
    {
        issuersMap[node].dids = dids;
        delete issuersMap[node].role;
        emit IssuersChanged(node, issuersMap[node]);
    }

    /**
     * Sets the dids associated with a role.
     * Clears the role associated with a role.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param role The role to set.
     */
    function setIssuerRole(bytes32 node, bytes32 role)
        external
        authorised(node)
    {
        issuersMap[node].role = role;
        delete issuersMap[node].dids;
        emit IssuersChanged(node, issuersMap[node]);
    }

    /**
     * Returns the issuers associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated issuers.
     */
    function issuers(bytes32 node)
        external
        view
        returns (address[] memory dids, bytes32 role)
    {
        return (issuersMap[node].dids, issuersMap[node].role);
    }

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return
            interfaceID == ISSUERS_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
