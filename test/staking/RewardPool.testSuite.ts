import { expect } from 'chai';
import { utils, BigNumber } from 'ethers';
import { RewardPool } from '../../ethers/RewardPool';
import { RewardPool__factory } from '../../ethers/factories/RewardPool__factory';
import { deployer } from './staking.testSuite';

const { parseEther } = utils;

const calculateReward = (
  stakeAmount: BigNumber,
  depositPeriod: BigNumber,
  patronRewardPortion: BigNumber
): BigNumber => {
  const dailyInterestNumerator = BigNumber.from(100027);
  const dailyInterestDenominator = BigNumber.from(100000);
  const secInDay = BigNumber.from(60 * 60 * 24);
  const depositPeriodInDays = depositPeriod.div(secInDay);
  let accumulatedStake = stakeAmount;
  for (let i = BigNumber.from(0); i.lt(depositPeriodInDays); i = i.add(1)) {
    accumulatedStake = accumulatedStake.mul(dailyInterestNumerator);
    accumulatedStake = accumulatedStake.div(dailyInterestDenominator);
  }
  const totalReward = accumulatedStake.sub(stakeAmount);
  return totalReward.mul(patronRewardPortion).div(BigNumber.from(1000));
};

export function rewardPoolTests(): void {
  let rewardPool: RewardPool;

  beforeEach(async () => {
    rewardPool = await (
      await new RewardPool__factory(deployer).deploy()
    ).deployed();
  });

  it('should calculate reward', async () => {
    const amount = parseEther('1');
    const period = BigNumber.from(60 * 60 * 24 * 365);
    const patronRewardPortion = 1000;

    expect(
      (await rewardPool.checkReward(amount, period, patronRewardPortion)).eq(
        calculateReward(amount, period, BigNumber.from(patronRewardPortion))
      )
    ).true;
  });
}
