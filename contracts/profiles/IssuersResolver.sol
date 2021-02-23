pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@ensdomains/resolver/contracts/ResolverBase.sol";

contract IssuersResolver is ResolverBase {
    bytes4 private constant NAME_INTERFACE_ID = 0xFFFFFFFF;

    struct Issuers {
        address[] dids;
        bytes32 role;
    }

    event IssuersChanged(bytes32 indexed node, Issuers newIssuers);

    mapping(bytes32 => Issuers) issuersMap;

    /**
     * Sets the name associated with an ENS node, for reverse records.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param dids The name to set.
     */
    function setIssuerDids(bytes32 node, address[] calldata dids)
        external
        authorised(node)
    {
        issuersMap[node].dids = dids;
        emit IssuersChanged(node, issuersMap[node]);
    }

    /**
     * Returns the name associated with an ENS node, for reverse records.
     * Defined in EIP181.
     * @param node The ENS node to query.
     * @return The associated name.
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
            interfaceID == NAME_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
