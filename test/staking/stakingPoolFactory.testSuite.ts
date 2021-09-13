import { expect } from "chai";
import { utils } from "ethers";
import { patronRole, stakingPoolFactory, serviceProvider, principalThreshold, org, getSigner, defaultMinStakingPeriod } from "./staking.testSuite";

const { namehash } = utils;

export function stakingPoolFactoryTests(): void {
  const patronRewardPortion = 80;
 
  it("service owner can launch staking pool", async () => {
    expect(await stakingPoolFactory.orgsList()).is.empty;
    
    await stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(org),
      defaultMinStakingPeriod,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold.mul(2) }
    );

    expect(await stakingPoolFactory.orgsList()).to.deep.equal([namehash(org)]);
  });

  it("non owner of service should not be able to launch pool", async () => {
    const nonOwner = await getSigner();

    return expect(stakingPoolFactory.connect(nonOwner).launchStakingPool(
      namehash(org),
      defaultMinStakingPeriod,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold }
    )).rejectedWith("StakingPoolFactory: Not authorized to create pool for this organization");
  });

  it("can't launch when principal less than threshold", async () => {
    return expect(stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(org),
      defaultMinStakingPeriod,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold.div(2) }
    )).rejectedWith("StakingPoolFactory: principal less than threshold");
  });

  it("can't launch several pools for service", async () => {
    await stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(org),
      defaultMinStakingPeriod,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold.mul(2) }
    );

    return expect(stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(org),
      defaultMinStakingPeriod,
      patronRewardPortion,
      [namehash(patronRole)],
      { value: principalThreshold.mul(2) }
    )).rejectedWith("StakingPoolFactory: pool for organization already launched");
  });
}