pragma solidity 0.5.17;

import "@ensdomains/ens/contracts/ENSRegistry.sol";
import "./RoleDefinitionResolver.sol";

interface EthereumDIDRegistry {
  function identityOwner(address identity) external view returns(address);
}

contract ClaimManager {
  struct Record {
    uint expireDate;
    string version;
  }
  
  event RoleRegistered(bytes32 role, address account);
  
  mapping(bytes32 => mapping(address => Record)) roles;
  address didRegistry;
  address ensRegistry;
  
  constructor(address _didRegistry, address _ensRegistry) public {
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
    bytes32 agreementHash = toEthSignedMessageHash(keccak256(abi.encodePacked(subject, role)));
    address subjectController = recover(agreementHash, subject_agreement);
    bytes32 proofHash = toEthSignedMessageHash(keccak256(abi.encodePacked(subject, role, expiry, issuer)));
    address issuerController = recover(proofHash, role_proof);
    
    EthereumDIDRegistry registry = EthereumDIDRegistry(didRegistry);
    require(
      registry.identityOwner(subject) == subjectController,
       "ClaimManager: subject agreement was not signed by subject controller"
    );
    require(
      registry.identityOwner(issuer) == issuerController,
       "ClaimManager: Role proof was not signed by issuer controller"
    );
    
    verifyPreconditions(subject, role);
    
    verifyIssuer(issuer, role);
    
    Record storage r = roles[role][subject];
    r.expireDate = block.timestamp + expiry;
    r.version = VersionNumberResolver(ENSRegistry(ensRegistry).resolver(role)).versionNumber(role);
    
    emit RoleRegistered(role, subject);
  }
  
  function verifyPreconditions(address subject, bytes32 role) internal {
    address resolver = ENSRegistry(ensRegistry).resolver(role);
    string memory version = VersionNumberResolver(resolver).versionNumber(role);
    // if (EnrollmentConditionTypeRolesResolver(resolver).requiresConditionType(role, 0)) {
      bytes32[] memory prerequisites = EnrolmentPrerequisiteRolesResolver(resolver).prerequisiteRoles(role);
      for (uint i = 0; i < prerequisites.length; i++) {
        require(
          this.hasRole(subject, prerequisites[i], version),
          "ClaimManager: Enrollment prerequisites are not met"
        );
      }
    // }
  }

  function verifyIssuer(address issuer, bytes32 role) internal {
    address resolver = ENSRegistry(ensRegistry).resolver(role);
    (address[] memory dids, bytes32 issuer_role) = IssuersResolver(resolver).issuers(role);
    if (dids.length > 0) {
      for (uint i = 0; i < dids.length; i++) {
        if (dids[i] == issuer) {
          return;
        }
      }
      revert("Claim Manager: Issuer does not listed in role issuers list");
    } else if(issuer_role != "") {
      string memory version = VersionNumberResolver(resolver).versionNumber(issuer_role);
      require(hasRole(issuer, issuer_role, version), "Claim Manager: Issuer does not have required role");
    } else {
      revert("Claim Manager: Role issuers are not specified");
    }
  }
  
  function toEthSignedMessageHash(bytes32 hash)
    internal
    pure
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
    );
  }
  
  function recover(bytes32 hash, bytes memory signature)
    internal
    pure
    returns (address)
  {
    bytes32 r;
    bytes32 s;
    uint8 v;

    if (signature.length != 65) {
      return (address(0));
    }

    // Divide the signature in r, s and v variables with inline assembly.
    assembly {
      r := mload(add(signature, 0x20))
      s := mload(add(signature, 0x40))
      v := byte(0, mload(add(signature, 0x60)))
    }

    if (v < 27) {
      v += 27;
    }

    if (v != 27 && v != 28) {
      return (address(0));
    } else {
      // solium-disable-next-line arg-overflow
      return ecrecover(hash, v, r, s);
    }
  }  
  
  function compareStrings(string memory a, string memory b) public view returns (bool) {
    return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
  }
}
