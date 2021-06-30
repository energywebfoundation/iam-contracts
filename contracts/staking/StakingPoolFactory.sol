pragma solidity 0.7.6;

import "../roles/ClaimManager.sol";
import "./StakingPool.sol";
import "@ensdomains/ens/contracts/ENSRegistry.sol";

contract StakingPoolFactory {
  uint immutable principalThreshold;
  bytes32 immutable serviceProviderRole;
  
  uint immutable withdrawDelay;
  
  address immutable claimManager;
  address immutable ensRegistry;
  bytes32[] patronRoles;
  
  address immutable rewardPool;
  
  /**
  * @dev pools by orgs
   */
  mapping(bytes32 => StakingPool) public pools;
  
  event StakingPoolLaunched(bytes32 org, address pool);
  
  constructor(
    uint _principalThreshold,
    bytes32 _serviceProviderRole,
    uint _withdrawDelay,
    address _claimManager,
    address _ensRegistry,
    bytes32[] memory _patronRoles,
    address _rewardPool
  ) {
    principalThreshold = _principalThreshold;
    serviceProviderRole = _serviceProviderRole;
    withdrawDelay = _withdrawDelay;
    claimManager = _claimManager;
    ensRegistry = _ensRegistry;
    patronRoles = _patronRoles;
    rewardPool = _rewardPool;
  }
  
  modifier isServiceProvider() {
    require(
      ClaimManager(claimManager).hasRole(msg.sender, serviceProviderRole, 0),
      "StakingPoolFactory: service provider doesn't have required role"
    );
    _;
  }
  
  function launchStakingPool(
    bytes32 org,
    uint minStakingPeriod,
    uint patronRewardPortion
  ) external isServiceProvider() payable {
    require(
      address(pools[org]) == address(0),
      "StakingPool: pool for organization already launched"
    );
    address orgOwner = ENSRegistry(ensRegistry).owner(org);
    require(
      orgOwner == msg.sender 
      || ENSRegistry(ensRegistry).isApprovedForAll(orgOwner, msg.sender),
      "StakingPoolFactory: Not authorized to create pool for this organization"
    );
    uint principal = msg.value;
    require(
      msg.value >= principalThreshold,
      "StakingPoolFactory: principal less than threshold"
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
    pools[org] = pool;
    
    emit StakingPoolLaunched(org, address(pool));
  }
}