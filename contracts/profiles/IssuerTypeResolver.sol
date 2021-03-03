pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@ensdomains/resolver/contracts/ResolverBase.sol";

/**
 * Profile for resolving type of issuance expect for a role.
 * These possible types are:
 * 0: Approval by some identity (i.e. an identity from a list of DIDs, or an identity with a given role)
 * 1: “Real-time” approval by a smart contract.
 */
contract IssuerTypeResolver is ResolverBase {
    bytes4 private constant ISSUER_TYPE_INTERFACE_ID = 0xc585f697;

    event IssuerTypeChanged(bytes32 indexed node, uint8 newType);

    mapping(bytes32 => uint8) public issuerTypes;

    /**
     * Sets the issuerType associated with a role def.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param issuerType The issuerType to set.
     */
    function setIssuerType(bytes32 node, uint8 issuerType)
        external
        authorised(node)
    {
        issuerTypes[node] = issuerType;
        emit IssuerTypeChanged(node, issuerTypes[node]);
    }

    /**
     * Returns the issuerType associated with a role def.
     * @param node The ENS node to query.
     * @return The associated issuer type.
     */
    function issuerType(bytes32 node) external view returns (uint8) {
        return (issuerTypes[node]);
    }

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return
            interfaceID == ISSUER_TYPE_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
