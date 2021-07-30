import { expect } from "chai"
import { utils } from "ethers";
import { RewardPool } from "../../ethers-v4/RewardPool";
import { RewardPool__factory } from "../../src";
import { deployer } from "./staking.testSuite";

const { BigNumber, parseEther } = utils;

const calculateReward = (
  stakeAmount: utils.BigNumber,
  depositPeriod: utils.BigNumber,
  patronRewardPortion: utils.BigNumber
): utils.BigNumber => {
  const dailyInterestNumerator = new BigNumber(100027);
  const dailyInterestDenominator = new BigNumber(100000);
  const secInDay = new BigNumber(60 * 60 * 24);
  const depositPeriodInDays = depositPeriod.div(secInDay);
  let accumulatedStake = stakeAmount;
  for (let i = new BigNumber(0); i.lt(depositPeriodInDays); i = i.add(1)) {
    accumulatedStake = accumulatedStake.mul(dailyInterestNumerator);
    accumulatedStake = accumulatedStake.div(dailyInterestDenominator);
  }
  const totalReward = accumulatedStake.sub(stakeAmount);
  return totalReward.mul(patronRewardPortion).div(new BigNumber(1000));
};

export function rewardPoolTests(): void {
  let rewardPool: RewardPool;

  beforeEach(async () => {
    rewardPool = await (await new RewardPool__factory(deployer).deploy()).deployed();
  });
  
  it("should calculate reward", async () => {
    const amount = parseEther("1");
    const period = new BigNumber(60 * 60 * 24 * 365);
    const patronRewardPortion = 500;

    expect(
      (await rewardPool.checkReward(amount, period, patronRewardPortion))
        .eq(calculateReward(amount, period, new BigNumber(patronRewardPortion)))
    )
      .true;
  });
}