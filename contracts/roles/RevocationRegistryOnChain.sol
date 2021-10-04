// SPDX-License-Identifier: GPL-3.0

pragma solidity >= 0.7.0 < 0.9.0;

import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@ew-did-registry/proxyidentity/contracts/IOwned.sol";
import "./RoleDefinitionResolver.sol";
import {ClaimManager} from "./ClaimManager.sol";

interface EthereumDIDRegistry {
    function identityOwner(address identity) external view returns(address);
    function validDelegate(address identity, bytes32 delegateType, address delegate) external view returns(bool);
}
    
contract RevocationRegistryOnChain {
    bytes32 constant private ASSERTION_DELEGATE_TYPE = 0x766572694b657900000000000000000000000000000000000000000000000000;

    struct RevokedClaim {
        address revoker;
        uint revokedTimestamp;
    }

    mapping (bytes32 => mapping(address => RevokedClaim)) revokedClaims;
    address private didRegistry;
    address private ensRegistry;
    address private claimManager;
    
    event Revoked(bytes32 role, address subject, address revoker);

    constructor(address _didRegistry, address _ensRegistry, address _claimManager){
        didRegistry = _didRegistry;
        ensRegistry = _ensRegistry;
        claimManager = _claimManager;
    }

    function revokeClaim(bytes32 role, address subject, address revoker) public {
        require(revokedClaims[role][subject].revokedTimestamp == 0, "The claim is already revoked");
        verifyRevoker(role, revoker);
        revokedClaims[role][subject].revoker = revoker;
        revokedClaims[role][subject].revokedTimestamp = block.number;
        emit Revoked(role, subject, revoker);
    }

    function revokeClaimsInList(bytes32 role, address [] memory subjects, address revoker) public{
        verifyRevoker(role, revoker);
        for(uint i=0; i<subjects.length ; i++) {
            require(revokedClaims[role][subjects[i]].revokedTimestamp == 0, "The claim is already revoked");
            revokedClaims[role][subjects[i]].revoker = revoker;
            revokedClaims[role][subjects[i]].revokedTimestamp = block.number;
            emit Revoked(role, subjects[i], revoker);
        }
    }

    function verifyRevoker(bytes32 role, address revoker) internal view {
        address resolver = ENSRegistry(ensRegistry).resolver(role);
        (address[] memory dids, bytes32 revoker_role) = RevokersResolver(resolver).revokers(role);
        if (dids.length > 0) {
          EthereumDIDRegistry registry = EthereumDIDRegistry(didRegistry);
            for (uint i = 0; i < dids.length; i++) {
                if (dids[i] == revoker || registry.validDelegate(dids[i], ASSERTION_DELEGATE_TYPE, revoker)) {
                    if (revoker == msg.sender || registry.validDelegate(msg.sender, ASSERTION_DELEGATE_TYPE, revoker)) {
                        return;
                    }
                }
            }
            revert("Revocation Registry: Revoker is not listed in role revokers list");
        } else if (revoker_role != "") {
            ClaimManager cm = ClaimManager(claimManager);
            bool hasRole = cm.hasRole(revoker, revoker_role, 0);
            if (hasRole) {
                bool roleStatus = isRevoked(revoker_role, revoker);
                if (!roleStatus) {
                    return;
                } else {
                    revert("Revocation Registry: Revoker's role has been revoked");
                }
            }
            revert("Revocation Registry: Revoker does not have required role");
        } else {
            revert("Revocation Registry: Role revokers are not specified");
        }
    }

    function isRevoked(bytes32 role, address subject) public view returns(bool) {
        if (revokedClaims[role][subject].revokedTimestamp == 0) {
            return false;
        }
        else {
            return true;
        }
    }

    function getRevocationDetail(bytes32 role, address subject) public view returns (address, uint) { 
        return (revokedClaims[role][subject].revoker, revokedClaims[role][subject].revokedTimestamp);
    }
}
