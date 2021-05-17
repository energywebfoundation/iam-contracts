pragma solidity 0.7.6;

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
    uint expireDate;
    string version;
  }
  
  struct Agreement {
    address subject;
    bytes32 role;
  }
  
  struct Proof {
    address subject;
    bytes32 role;
    uint256 expiry;
    address issuer;
  }
  
  bytes32 constant AGREEMENT_TYPEHASH = keccak256(
    "Agreement(address subject,bytes32 role)"
  );

  bytes32 constant public PROOF_TYPEHASH = keccak256(
    "Proof(address subject,bytes32 role,uint expiry,address issuer)"
  );
  
  event RoleRegistered(bytes32 role, address subject);
  
  mapping(bytes32 => mapping(address => Record)) private roles;
  address private didRegistry;
  address private ensRegistry;
  
  constructor(address _didRegistry, address _ensRegistry) EIP712(ERC712_DOMAIN_NAME, ERC712_DOMAIN_VERSION) {
    didRegistry = _didRegistry;
    ensRegistry = _ensRegistry;
  }
  
  function hasRole(address subject, bytes32 role, string memory version) public view returns(bool) {
    Record memory r = roles[role][subject];
    return r.expireDate > block.timestamp && compareStrings(r.version, version);
  }
  
  function register(
    address subject, 
    bytes32 role,
    uint expiry,
    address issuer,
    bytes calldata subject_agreement,
    bytes calldata role_proof
    ) external {
    bytes32 agreementHash = ECDSA.toEthSignedMessageHash(
      _hashTypedDataV4(keccak256(abi.encode(
      AGREEMENT_TYPEHASH,
      subject,
      role
    ))));
    address agreementSigner = ECDSA.recover(agreementHash, subject_agreement);
    
    bytes32 proofHash = ECDSA.toEthSignedMessageHash(
      _hashTypedDataV4(keccak256(abi.encode(
      PROOF_TYPEHASH,
      subject,
      role,
      expiry,
      issuer
    ))));
    address proofSigner = ECDSA.recover(proofHash, role_proof);
    
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
    r.expireDate = block.timestamp + expiry;
    r.version = VersionNumberResolver(ENSRegistry(ensRegistry).resolver(role)).versionNumber(role);
    
    emit RoleRegistered(role, subject);
  }
  
  function verifyPreconditions(address subject, bytes32 role) internal view {
    address resolver = ENSRegistry(ensRegistry).resolver(role);
    string memory version = VersionNumberResolver(resolver).versionNumber(role);
    
    (bytes32[] memory roles, bool mustHaveAll) = EnrolmentPrerequisiteRolesResolver(resolver).prerequisiteRoles(role);
    if (roles.length == 0) {
      return;
    }
    uint numberOfRequiredRoles = mustHaveAll ? roles.length : 1;
    uint numberOfRoles = 0;
    for (uint i = 0; i < roles.length && numberOfRoles < numberOfRequiredRoles; i++) {
      if (this.hasRole(subject, roles[i], version)) {
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
      string memory version = VersionNumberResolver(resolver).versionNumber(issuer_role);
      require(hasRole(issuer, issuer_role, version), "ClaimManager: Issuer does not has required role");
    } else {
      revert("ClaimManager: Role issuers are not specified");
    }
  }
  
  function compareStrings(string memory a, string memory b) public pure returns (bool) {
    return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
  }
}
