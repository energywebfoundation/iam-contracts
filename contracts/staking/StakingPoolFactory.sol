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
  mapping(bytes32 => StakingPool) pools;
  
  event StakingPoolLaunched(bytes32 service, address pool);
  
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
  
  modifier isServiceProvider(bytes32 service) {
    require(
      ClaimManager(claimManager).hasRole(msg.sender, serviceProviderRole, 0),
      "StakingPoolFactory: service provider doesn't have required role"
    );
    address serviceOwner = ENSRegistry(ensRegistry).owner(service);
    require(
      serviceOwner == msg.sender 
      || ENSRegistry(ensRegistry).isApprovedForAll(serviceOwner, msg.sender),
      "StakingPoolFactory: Not authorized to create pool for services in this domain"
    );
    require(
      msg.value >= principalThreshold,
      "StakingPoolFactory: service principal less than threshold"
    );
    _;
  }
  
  function launchStakingPool(
    bytes32 service,
    uint minStakingPeriod,
    uint sharing
  ) external isServiceProvider(service) payable {
    require(
      address(pools[service]) == address(0),
      "StakingPool: pool for service already launched"
    );
    StakingPool pool = (new StakingPool)
    {value: msg.value}
    (
      minStakingPeriod,
      withdrawDelay,
      claimManager,
      patronRoles,
      rewardPool,
      sharing
    );
    pools[service] = pool;
    
    emit StakingPoolLaunched(service, address(pool));
  }
}