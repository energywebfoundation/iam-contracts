pragma solidity 0.8.6;

contract RewardPool {
  modifier isStakingPool() {
    _;
  }
  
  function payReward(
    address staker,
    uint stakeAmount,
    uint stakingInterval
  ) isStakingPool external {
  }
  
  function checkReward(address patron) isStakingPool public returns (uint reward){
    reward = 0; 
  }
}