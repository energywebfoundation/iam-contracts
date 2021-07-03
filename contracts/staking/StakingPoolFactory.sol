pragma solidity 0.8.6;

import "../roles/ClaimManager.sol";
import "./StakingPool.sol";
import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";

contract StakingPoolFactory {
  struct Service {
    address provider;
    address pool;
  }
  uint immutable principalThreshold;
  
  uint immutable withdrawDelay;
  
  address immutable claimManager;
  address immutable ensRegistry;
  
  address immutable rewardPool;
  
  /**
  * @dev services by orgs
   */
  mapping(bytes32 => Service) public services;
  bytes32[] orgs;
  
  event StakingPoolLaunched(bytes32 indexed org, address indexed pool);
  
  constructor(
    uint _principalThreshold,
    uint _withdrawDelay,
    address _claimManager,
    address _ensRegistry,
    address _rewardPool
  ) {
    principalThreshold = _principalThreshold;
    withdrawDelay = _withdrawDelay;
    claimManager = _claimManager;
    ensRegistry = _ensRegistry;
    rewardPool = _rewardPool;
  }
  
  function launchStakingPool(
    bytes32 org,
    uint minStakingPeriod,
    uint patronRewardPortion,
    bytes32[] memory patronRoles
  ) external payable {
    require(
      address(services[org].pool) == address(0),
      "StakingPool: pool for organization already launched"
    );
    address orgOwner = ENSRegistry(ensRegistry).owner(org);
    uint principal = msg.value;
    address provider = msg.sender;
    require(
      orgOwner == provider
      || ENSRegistry(ensRegistry).isApprovedForAll(orgOwner, provider),
      "StakingPoolFactory: Not authorized to create pool for this organization"
    );
    require(
      principal >= principalThreshold,
      "StakingPoolFactory: principal less than threshold"
    );
    StakingPool pool = (new StakingPool)
    {value: principal}
    (
      minStakingPeriod,
      withdrawDelay,
      claimManager,
      patronRoles,
      rewardPool,
      patronRewardPortion
    );
    services[org].pool = address(pool);
    services[org].provider = provider;
    orgs.push(org);
    
    emit StakingPoolLaunched(org, address(pool));
  }
  
  function orgsList() public view returns (bytes32[] memory) {
    return orgs;
  }
}