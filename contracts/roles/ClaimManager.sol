pragma solidity 0.7.6;
pragma abicoder v2;

import "@ensdomains/ens/contracts/ENSRegistry.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/drafts/EIP712.sol";
import "./RoleDefinitionResolver.sol";

interface EthereumDIDRegistry {
  function identityOwner(address identity) external view returns(address);
  function validDelegate(address identity, bytes32 delegateType, address delegate) external view returns(bool);
}

contract ClaimManager is EIP712 {
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
  address private didRegistry;
  address private ensRegistry;
  
  constructor(address _didRegistry, address _ensRegistry) EIP712(ERC712_DOMAIN_NAME, ERC712_DOMAIN_VERSION) public {
    didRegistry = _didRegistry;
    ensRegistry = _ensRegistry;
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
    
    bytes32 agreementHash = ECDSA.toEthSignedMessageHash(
      _hashTypedDataV4(keccak256(abi.encode(
      AGREEMENT_TYPEHASH,
      subject,
      role,
      version
    ))));
    
    bytes32 proofHash = ECDSA.toEthSignedMessageHash(
      _hashTypedDataV4(keccak256(abi.encode(
      PROOF_TYPEHASH,
      subject,
      role,
      version,
      expiry,
      issuer
    ))));
    agreementSigner = ECDSA.recover(agreementHash, subject_agreement);
    proofSigner = ECDSA.recover(proofHash, role_proof);
    }
        
    EthereumDIDRegistry registry = EthereumDIDRegistry(didRegistry);
    require(
      registry.identityOwner(subject) == agreementSigner || registry.validDelegate(subject, ASSERTION_DELEGATE_TYPE, agreementSigner),
       "ClaimManager: agreement signer is not authorized to sign on behalf of subject"
    );
    require(
      registry.identityOwner(issuer) == proofSigner || registry.validDelegate(issuer, ASSERTION_DELEGATE_TYPE, proofSigner),
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
}