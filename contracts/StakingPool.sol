pragma solidity 0.7.6;
import "./ClaimManager.sol";
import "./RewardPool.sol";

contract StakingPool {
  uint immutable principle;
  uint immutable minStakingPeriod; // seconds

  uint immutable withdrawDelay; // seconds
  
  address immutable claimManager;
  bytes32 immutable patronRole;
  
  address immutable rewardPool;
  
  mapping(address => Stake) stakes;
  
  enum StakeStatus { NONSTAKING, STAKING, WITHDRAWING }
  
  struct Stake {
    uint amount;
    uint start;
    uint end;
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
    
    principle = msg.value;
    
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
      stake.amount > 0,
      "StakingPool: Replenishment of the stake is not allowed"
    );
    uint amount = msg.value;
    require(amount > 0, "StakingPool: stake amount is not provided");
    uint start = block.timestamp;
    stake.amount = amount;
    stake.start = start;
    stake.end = 0;
    stake.status = StakeStatus.STAKING;
    RewardPool(rewardPool).startStaking(msg.sender, amount, start);
  }
  
  /**
  * @dev stops staking and notifies reward pool
   */
  function requestWithdraw() external {
    Stake storage stake = stakes[msg.sender];
    require(stake.amount > 0, "StakingPool: No stake to withdraw");
    require(
      block.timestamp >= stake.end + minStakingPeriod,
       "StakingPool: Minimum staking period is not expired yet"
    );
    uint stakingEnd = block.timestamp;
    stake.status = StakeStatus.WITHDRAWING;
    stake.end = stakingEnd;
    
    RewardPool(rewardPool).completeStaking(msg.sender, stakingEnd);    
  }
  
  /**
  * @dev invoked after expiring of withdraw delay
   */
  function withdraw(address payable staker) external {
    Stake storage stake = stakes[staker];
    require(
      stake.status == StakeStatus.WITHDRAWING, 
      "StakingPool: Stake hasn't requested to withdraw"
    );
    require(
      stake.end + withdrawDelay <= block.timestamp,
      "StakingPool: Withdrawal delay hasn't expired yet"
    );
    RewardPool(rewardPool).payReward(staker);
    staker.transfer(stake.amount);
    delete stakes[staker];
  }
}