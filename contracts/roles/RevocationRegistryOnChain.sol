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
    string constant private ERC712_DOMAIN_NAME = "Revocation Registry";
    string constant private ERC712_DOMAIN_VERSION = "1.0";

    struct RevokedClaim {
        address revoker;
        uint revokedTimestamp;
        bytes32 revokerRole; //namehash
    }

    mapping(bytes32 => RevokedClaim) revokedClaims;
    address private didRegistry;
    address private ensRegistry;
    address private claimManager;
    
    event Revoked(address revoker, bytes32 claimDigest);

    constructor(address _didRegistry, address _ensRegistry, address _claimManager){
        didRegistry = _didRegistry;
        ensRegistry = _ensRegistry;
        claimManager = _claimManager;
    }

    function revokeClaim(bytes32 claimDigest, bytes32 role, address revoker, bytes32 revokerRole) public {
        require(revokedClaims[claimDigest].revokedTimestamp == 0, "The claim is already revoked");
        verifyRevoker(revoker, role);
        revokedClaims[claimDigest].revoker = revoker;
        revokedClaims[claimDigest].revokedTimestamp = block.number;
        revokedClaims[claimDigest].revokerRole = revokerRole;
        emit Revoked(revoker, claimDigest);
    }

    function revokeClaimInList(bytes32 [] memory claimList,bytes32 role, address revoker, bytes32 revokerRole) public{
        verifyRevoker(revoker, role);
        for(uint i=0; i<claimList.length ; i++) {
            require(revokedClaims[claimList[i]].revokedTimestamp == 0, "The claim is already revoked");
            revokedClaims[claimList[i]].revoker = revoker;
            revokedClaims[claimList[i]].revokedTimestamp = block.number;
            revokedClaims[claimList[i]].revokerRole = revokerRole;
            emit Revoked(revoker, claimList[i]);
        }
    }

    function verifyRevoker(address revoker, bytes32 role) internal view {
        address resolver = ENSRegistry(ensRegistry).resolver(role);
        (address[] memory dids, bytes32 revoker_role) = RevokersResolver(resolver).revokers(role);
        if (dids.length > 0) {
          EthereumDIDRegistry registry = EthereumDIDRegistry(didRegistry);
            for (uint i = 0; i < dids.length; i++) {
                if (dids[i] == revoker || registry.validDelegate(dids[i], ASSERTION_DELEGATE_TYPE, revoker)) {
                    return;
                }
            }
            revert("Revocation Registry: Revoker is not listed in role revokers list");
        } else if (revoker_role != "") {
            ClaimManager cm = ClaimManager(claimManager);
            bool hasRole = cm.hasRole(revoker, revoker_role, 0);
            if (hasRole) {
                bytes32 revokerClaimDigest = keccak256(abi.encodePacked(revoker, revoker_role));
                bool roleStatus = isRevoked(revokerClaimDigest);
                if (roleStatus) {
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

    function isRevoked(bytes32 claimDigest) public view returns(bool) {
        if (revokedClaims[claimDigest].revokedTimestamp == 0) {
            return false;
        }
        else {
            return true;
        }
    }
}
