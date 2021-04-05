pragma solidity 0.5.17;

contract DomainNotifier {
    event DomainUpdated(bytes32 indexed node);

    // Maybe need to ensure that this can only be called by the resolver set for the node
    // But this might require depending on a known ENS registry
    function domainUpdated(bytes32 node) external {
        emit DomainUpdated(node);
    }
}
