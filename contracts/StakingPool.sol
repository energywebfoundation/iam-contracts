pragma solidity 0.7.6;
import "./ClaimManager.sol";
import "./RewardPool.sol";

contract StakingPool {
  struct Stake {
    uint amount;
    uint start;
    uint withdrawalRequested;
    StakeStatus status;
  }
  
  enum StakeStatus { NONSTAKING, STAKING, WITHDRAWING }
  
  event StakePut(address indexed patron, uint indexed amount, uint indexed timestamp);
  event StakeWithdrawalRequested(address indexed patron, uint indexed timestamp);
  event StakeWithdrawn(address indexed patron, uint indexed timestamp);
  
  uint principal;
  uint public totalStake;
  uint immutable minStakingPeriod; // seconds

  uint immutable withdrawDelay; // seconds
  
  address immutable claimManager;
  bytes32 immutable patronRole;
  
  address immutable rewardPool;
  
  mapping(address => Stake) public stakes;
  address[] patrons;
  mapping(address => uint) indexOfPatron;
  
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
    totalStake = principal;
    
    rewardPool = _rewardPool;
  }
  
  modifier isPatron() {
    require(
      ClaimManager(claimManager).hasRole(msg.sender, patronRole, 0),
      "StakingPool: patron is not registered with patron role"
    );
    _;
  }
  
  function putStake() payable external isPatron {
    address patron = msg.sender;
    Stake storage stake = stakes[patron];
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
    totalStake += stake.amount;
    addPatron(patron);
    
    emit StakePut(patron, stake.amount, stake.start);
  }
  
  /**
  * @dev stops staking and notifies reward pool
   */
  function requestWithdraw() external {
    address patron = msg.sender;
    Stake storage stake = stakes[patron];
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
    
    emit StakeWithdrawalRequested(patron, stake.withdrawalRequested);
  }
  
  /**
  * @dev invoked after expiring of withdraw delay
   */
  function withdraw() external {
    address payable patron = msg.sender;
    Stake storage stake = stakes[patron];
    require(
      stake.status == StakeStatus.WITHDRAWING, 
      "StakingPool: Stake hasn't requested to withdraw"
    );
    require(
      block.timestamp >= stake.withdrawalRequested + withdrawDelay,
      "StakingPool: Withdrawal delay hasn't expired yet"
    );
    RewardPool(rewardPool).payReward(patron, stake.amount, stake.withdrawalRequested - stake.start);
    patron.transfer(stake.amount);   
    totalStake -= stake.amount;
    delete stakes[patron];
    removePatron(patron);
    
    emit StakeWithdrawn(patron, block.timestamp);
  }
  
  function addPatron(address _patron) internal {
    patrons.push(_patron);
    indexOfPatron[_patron] = patrons.length - 1;
  }
  
  function removePatron(address _patron) internal {
    uint index = indexOfPatron[_patron];
    require(
      patrons[index] == _patron,
      "StakingPool: No such patron"
    );
    
    if (index > 0 && index < patrons.length - 1) {
      patrons[index] = patrons[patrons.length-1];
      indexOfPatron[patrons[index]] = index;
    }
    patrons.pop();
  }
}