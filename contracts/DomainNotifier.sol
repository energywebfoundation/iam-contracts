pragma solidity 0.7.6;

import "@ensdomains/ens/contracts/ENS.sol";

contract DomainNotifier {
    event DomainUpdated(bytes32 indexed node);

    ENS _ens;

    constructor(ENS ens) {
        _ens = ens;
    }

    function domainUpdated(bytes32 node) external {
        address resolver = _ens.resolver(node);
        require(resolver == msg.sender);
        emit DomainUpdated(node);
    }
}
