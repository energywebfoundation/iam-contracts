pragma solidity 0.8.6;

import "./StakingPoolFactory.sol";

contract RewardPool {
  uint constant dailyInterestNumerator = 100027;
  uint constant dailyInterestDenominator = 100000;
  address immutable stakingPoolFactory;
  
  constructor() {
    stakingPoolFactory = msg.sender;
  }
  
  modifier isStakingPool() {
    require(
      StakingPoolFactory(stakingPoolFactory).isPool(msg.sender),
      "RewardPool: only StakingPool allowed"
    );
    _;
  }
  
  receive() external payable { }
  
  function payReward(
    address payable patron,
    uint stakeAmount,
    uint depositPeriod,
    uint patronRewardPortion
  ) isStakingPool external {
    patron.transfer(
      _calculateReward(stakeAmount, depositPeriod, patronRewardPortion)
    );
  }
  
  function checkReward(
    uint stakeAmount,
    uint depositPeriod,
    uint patronRewardPortion
    )
   public view returns (uint reward){
    reward = _calculateReward(stakeAmount, depositPeriod, patronRewardPortion); 
  }
  
  function _calculateReward(
    uint stakeAmount,
    uint depositPeriod,
    uint patronRewardPortion
    )
    internal view returns (uint reward) {
    require(
      patronRewardPortion > 0 && patronRewardPortion < 1000,
      "RewardPool: patron reward portion should be in 0...1000"
    );
    uint depositPeriodInDays = depositPeriod / (1 days);
    uint accumulatedStake = stakeAmount;
    // reverted on dailyInterestNumerator ** depositPeriodInDays
    for (uint i = 0; i < depositPeriodInDays; i++) {
      accumulatedStake *= dailyInterestNumerator;
      accumulatedStake /= dailyInterestDenominator;      
    }
    uint totalReward =  accumulatedStake - stakeAmount;
    reward =  (totalReward * patronRewardPortion) / 1000;
  }
}