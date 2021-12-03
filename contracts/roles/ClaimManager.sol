pragma solidity 0.8.6;

import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@ew-did-registry/proxyidentity/contracts/IOwned.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./RoleDefinitionResolverV2.sol";

interface EthereumDIDRegistry {
  function identityOwner(address identity) external view returns(address);
  function validDelegate(address identity, bytes32 delegateType, address delegate) external view returns(bool);
}

contract ClaimManager is Initializable, UUPSUpgradeable, OwnableUpgradeable, EIP712Upgradeable {
  /**
  * @dev `veriKey` delegation type from EthereumDIDRegistry
   */
  bytes32 constant private ASSERTION_DELEGATE_TYPE = 0x766572694b657900000000000000000000000000000000000000000000000000;
  string constant private ERC712_DOMAIN_NAME = "Claim Manager";
  string constant private ERC712_DOMAIN_VERSION = "1.0";
  
  struct Record {
    uint256 expiry;
    uint256 version;
  }
  
  struct Agreement {
    address subject;
    bytes32 role;
    uint256 version;
  }
  
  struct Proof {
    address subject;
    bytes32 role;
    uint256 version;
    uint256 expiry;
    address issuer;
  }
  
  bytes32 constant AGREEMENT_TYPEHASH = keccak256(
    "Agreement(address subject,bytes32 role,uint256 version)"
  );

  bytes32 constant public PROOF_TYPEHASH = keccak256(
    "Proof(address subject,bytes32 role,uint256 version,uint256 expiry,address issuer)"
  );
  
  event RoleRegistered(address subject, bytes32 role, uint256 version, uint256 expiry, address issuer);
  
  mapping(bytes32 => mapping(address => Record)) private roles;
  mapping(bytes32 => bool) public proofHashes;
  address private didRegistry;
  address private ensRegistry;
  
  function initialize(address _didRegistry, address _ensRegistry) public initializer{
    didRegistry = _didRegistry;
    ensRegistry = _ensRegistry;
    __Ownable_init();
    __EIP712_init(ERC712_DOMAIN_NAME, ERC712_DOMAIN_VERSION);
  }
  
  function isAuthorized(address identity, address approved) internal returns (bool) {
    EthereumDIDRegistry registry = EthereumDIDRegistry(didRegistry);
    if (
      registry.identityOwner(identity) == approved || 
      (ERC165CheckerUpgradeable.supportsInterface(identity, type(IOwned).interfaceId) && approved == IOwned(identity).owner()) ||
      registry.validDelegate(identity, ASSERTION_DELEGATE_TYPE, approved)
      ) {
        return true;
      } else {
        return false;
      }
  }
  
  function hasRole(address subject, bytes32 role, uint256 version) public view returns(bool) {
    Record memory r = roles[role][subject];
    if (version == 0) {
      return r.expiry > block.timestamp;
    } else {
      return r.expiry > block.timestamp && r.version >= version;
    }
  }
  
  function register(
    address subject, 
    bytes32 role,
    uint256 version,
    uint256 expiry,
    address issuer,
    bytes calldata subject_agreement,
    bytes calldata role_proof
    ) external {
    address proofSigner;
    address agreementSigner;
    {
    require(VersionNumberResolver(ENSRegistry(ensRegistry).resolver(role)).versionNumber(role) >= version, 
    "ClaimManager: Such version of this role doesn't exist");
    
    bytes32 agreementHash = ECDSAUpgradeable.toEthSignedMessageHash(
      _hashTypedDataV4(keccak256(abi.encode(
      AGREEMENT_TYPEHASH,
      subject,
      role,
      version
    ))));

    bytes32 proofHash = ECDSAUpgradeable.toEthSignedMessageHash(
      _hashTypedDataV4(keccak256(abi.encode(
      PROOF_TYPEHASH,
      subject,
      role,
      version,
      expiry,
      issuer
    ))));

    require(proofHashes[proofHash] == false, "ClaimManager: The proof has been submitted already");

    agreementSigner = ECDSAUpgradeable.recover(agreementHash, subject_agreement);
    proofSigner = ECDSAUpgradeable.recover(proofHash, role_proof);
    proofHashes[proofHash] = true;
    }
        
    require(
      isAuthorized(subject, agreementSigner),
       "ClaimManager: agreement signer is not authorized to sign on behalf of subject"
    );
    require(
      isAuthorized(issuer, proofSigner),
       "ClaimManager: proof signer is not authorized to sign on behalf of issuer"
    );
    
    verifyPreconditions(subject, role);
    
    verifyIssuer(issuer, role);
    
    Record storage r = roles[role][subject];
    r.expiry = expiry;
    r.version = version;

    emit RoleRegistered(subject, role, version, expiry, issuer);
  }
  
  function verifyPreconditions(address subject, bytes32 role) internal view {
    address resolver = ENSRegistry(ensRegistry).resolver(role);
    
    (bytes32[] memory requiredRoles, bool mustHaveAll) = EnrolmentPrerequisiteRolesResolver(resolver).prerequisiteRoles(role);
    if (requiredRoles.length == 0) {
      return;
    }
    uint numberOfRequiredRoles = mustHaveAll ? requiredRoles.length : 1;
    uint numberOfRoles = 0;
    for (uint i = 0; i < requiredRoles.length && numberOfRoles < numberOfRequiredRoles; i++) {
      if (this.hasRole(subject, requiredRoles[i], 0)) {
        numberOfRoles++;
      }
    }
    require(
      numberOfRoles == numberOfRequiredRoles,
      "ClaimManager: Enrollment prerequisites are not met"
    );
  }

  function verifyIssuer(address issuer, bytes32 role) internal view {
    address resolver = ENSRegistry(ensRegistry).resolver(role);
    (address[] memory dids, bytes32 issuer_role) = IssuersResolver(resolver).issuers(role);
    if (dids.length > 0) {
      EthereumDIDRegistry registry = EthereumDIDRegistry(didRegistry);
      for (uint i = 0; i < dids.length; i++) {
        if (dids[i] == issuer || registry.validDelegate(dids[i], ASSERTION_DELEGATE_TYPE, issuer)) {
          return;
        }
      }
      revert("ClaimManager: Issuer is not listed in role issuers list");
    } else if (issuer_role != "") {
      require(hasRole(issuer, issuer_role, 0), "ClaimManager: Issuer does not has required role");
    } else {
      revert("ClaimManager: Role issuers are not specified");
    }
  }

  function version() external pure returns (string memory) {
      return "v0.1";
  }

  function _authorizeUpgrade(address) internal override onlyOwner {
        // Allow only owner to authorize a smart contract upgrade
  }
}