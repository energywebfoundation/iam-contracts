pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "@ensdomains/ens/contracts/ENS.sol";
import "@ensdomains/resolver/contracts/PublicResolver.sol";
import "./DomainNotifier.sol";
import "./profiles/enrolment-conditions/EnrolmentPrerequisiteRolesResolver.sol";
import "./profiles/issuance/IssuersResolver.sol";
import "./profiles/issuance/IssuerTypeResolver.sol";
import "./profiles/VersionNumberResolver.sol";

/**
 * An extension of the PublicResolver customized for RoleDefinitions
 */
contract RoleDefinitionResolver is
    PublicResolver,
    VersionNumberResolver,
    IssuerTypeResolver,
    IssuersResolver,
    EnrolmentPrerequisiteRolesResolver
{
    bytes4 private constant DOMAIN_UPDATED_INTERFACE_ID = 0x61610164;

    DomainNotifier private notifier;

    constructor(ENS _ens, DomainNotifier _notifier) PublicResolver(_ens) {
        notifier = _notifier;
    }

    function isAuthorised(bytes32 node)
        internal
        view
        override(PublicResolver, ResolverBase)
        returns (bool)
    {
        address owner = ens.owner(node);
        return
            owner == msg.sender ||
            authorisations[node][owner][msg.sender] ||
            ens.isApprovedForAll(owner, msg.sender);
    }

    function domainUpdated(bytes32 node) external authorised(node) {
        notifier.domainUpdated(node);
    }

    function supportsInterface(bytes4 interfaceID)
        public
        pure
        override(
            PublicResolver,
            VersionNumberResolver,
            IssuerTypeResolver,
            IssuersResolver,
            EnrolmentPrerequisiteRolesResolver
        )
        returns (bool)
    {
        return
            interfaceID == DOMAIN_UPDATED_INTERFACE_ID ||
            super.supportsInterface(interfaceID);
    }
}
