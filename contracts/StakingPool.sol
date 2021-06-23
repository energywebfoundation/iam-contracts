pragma solidity 0.7.6;
import "./ClaimManager.sol";
import "./RewardPool.sol";

contract StakingPool {
  uint immutable principal;
  uint immutable minStakingPeriod; // seconds

  uint immutable withdrawDelay; // seconds
  
  address immutable claimManager;
  bytes32 immutable patronRole;
  
  address immutable rewardPool;
  
  mapping(address => Stake) public stakes;
  
  enum StakeStatus { NONSTAKING, STAKING, WITHDRAWING }
  
  struct Stake {
    uint amount;
    uint start;
    uint withdrawalRequested;
    StakeStatus status;
  }
  
  constructor(
    uint _minStakingPeriod,
    uint _withdrawDelay,
    address _claimManager,
    bytes32 _patronRole,
    address _rewardPool
  ) payable {
    minStakingPeriod = _minStakingPeriod;
    withdrawDelay = _withdrawDelay;
    claimManager = _claimManager;
    patronRole = _patronRole;
    
    principal = msg.value;
    
    rewardPool = _rewardPool;
  }
  
  modifier isPatron() {
    require(
      ClaimManager(claimManager).hasRole(msg.sender, patronRole, 0),
      "StakingPool: staker is not registered with patron role"
    );
    _;
  }
  
  function putStake() payable external isPatron {
    Stake storage stake = stakes[msg.sender];
    require(
      stake.status == StakeStatus.NONSTAKING,
      "StakingPool: Replenishment of the stake is not allowed"
    );
    uint amount = msg.value;
    require(amount > 0, "StakingPool: stake amount is not provided");
    uint start = block.timestamp;
    stake.amount = amount;
    stake.start = start;
    stake.withdrawalRequested = 0;
    stake.status = StakeStatus.STAKING;
  }
  
  /**
  * @dev stops staking and notifies reward pool
   */
  function requestWithdraw() external {
    Stake storage stake = stakes[msg.sender];
    require(
      stake.status == StakeStatus.STAKING,
      "StakingPool: No stake to withdraw"
    );
    require(
      block.timestamp >= stake.start + minStakingPeriod,
       "StakingPool: Minimum staking period is not expired yet"
    );
    stake.status = StakeStatus.WITHDRAWING;
    stake.withdrawalRequested = block.timestamp;
  }
  
  /**
  * @dev invoked after expiring of withdraw delay
   */
  function withdraw() external {
    address payable staker = msg.sender;
    Stake storage stake = stakes[staker];
    require(
      stake.status == StakeStatus.WITHDRAWING, 
      "StakingPool: Stake hasn't requested to withdraw"
    );
    require(
      block.timestamp >= stake.withdrawalRequested + withdrawDelay,
      "StakingPool: Withdrawal delay hasn't expired yet"
    );
    RewardPool(rewardPool).payReward(staker, stake.amount, stake.withdrawalRequested - stake.start);
    staker.transfer(stake.amount);
    delete stakes[staker];
  }
}