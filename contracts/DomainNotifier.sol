pragma solidity 0.7.6;

import "@ensdomains/ens/contracts/ENS.sol";

/**
 * DomainNotifier is used as a central point from which to
 * determine which ENS domains (namespaces) have had their
 * resolved data updated
 */
contract DomainNotifier {
    event DomainUpdated(bytes32 indexed node);

    ENS _ens;

    constructor(ENS ens) {
        _ens = ens;
    }

    /**
     * Notifies of a domain/namespace's resolver data update.
     * Only the resolver that is set for a given node should
     * be able to trigger the notification
     */
    function domainUpdated(bytes32 node) external {
        address resolver = _ens.resolver(node);
        require(resolver == msg.sender);
        emit DomainUpdated(node);
    }
}
