import { namehash, parseEther } from "ethers/utils";
import { expect } from "chai";
import { requestRole } from "../test_utils/role_utils";
import { claimManager, waitFor, ewc, patron, deployer, defaultMinStakingPeriod, defaultWithdrawDelay, patronRole } from "./staking.testSuite";
import { StakingPool } from "../../ethers-v4/StakingPool";
import { RewardPool__factory, StakingPool__factory } from "../../src";

export function stakingPoolTests(): void {
  let stakingPool: StakingPool;
  const amount = parseEther("0.1");
  const version = 1;
  const patronRewardPortion = 80;
  const principal = parseEther("0.2");

  async function setupContracts(
    { minStakingPeriod = defaultMinStakingPeriod, withdrawDelay = defaultWithdrawDelay }
      : { minStakingPeriod?: number; withdrawDelay?: number } = {}
  ) {
    const rewardPool = await (await new RewardPool__factory(deployer).deploy()).deployed();
    stakingPool = await (await new StakingPool__factory(deployer).deploy(
      minStakingPeriod,
      withdrawDelay,
      claimManager.address,
      [namehash(patronRole)],
      rewardPool.address,
      patronRewardPortion,
      { value: principal }
    )).deployed();
  }

  beforeEach(async () => {
    await setupContracts();
  })

  it("initial stakes consists only from principal", async () => {
    expect((await stakingPool.totalStake()).eq(principal)).true;
  });

  it("should not be possible to put a stake without having patron role", async () => {
    return expect(stakingPool.putStake({ value: amount }))
      .rejectedWith("StakingPool: patron is not registered with patron role");
  });

  it("having patron role should be able to put a stake", async () => {
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });

    const stakePut = waitFor(
      stakingPool.filters.StakePut(
        await patron.getAddress(),
        amount,
        null
      ),
      stakingPool
    );

    stakingPool.connect(patron).putStake({ value: amount });

    return expect(stakePut).fulfilled;
  });

  it("putting stake should increase total stake", async () => {
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    expect((await stakingPool.totalStake()).eq(principal.add(amount))).true;
  })

  it("should not be possible to replenish stake", async () => {
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    return expect(stakingPool.connect(patron).putStake({ value: amount }))
      .rejectedWith("StakingPool: Replenishment of the stake is not allowed");
  });

  it("should not be possible to request withdraw before minimal staking period is expired", async () => {
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    return expect(stakingPool.connect(patron).requestWithdraw())
      .rejectedWith("StakingPool: Minimum staking period is not expired yet");
  });

  it("should be able to request withdraw after minimal staking period is expired", async () => {
    const minStakingPeriod = 1;
    await setupContracts({ minStakingPeriod });
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });

    const withdrawnRequested = waitFor(
      stakingPool.filters.StakeWithdrawalRequested(await patron.getAddress(), null),
      stakingPool
    );
    stakingPool.connect(patron).requestWithdraw();

    return expect(withdrawnRequested).fulfilled;
  });

  it("should not be possible to repeat withdrawal request", async () => {
    const minStakingPeriod = 1;
    await setupContracts({ minStakingPeriod });
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });

    await stakingPool.connect(patron).requestWithdraw();

    return expect(stakingPool.connect(patron).requestWithdraw()).rejectedWith("StakingPool: No stake to withdraw");
  });

  it("should not be possible to withdraw before withdraw delay is expired", async () => {
    const minStakingPeriod = 1;
    await setupContracts({ minStakingPeriod });
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });
    await stakingPool.connect(patron).requestWithdraw();

    return expect(stakingPool.connect(patron).withdraw())
      .rejectedWith("StakingPool: Withdrawal delay hasn't expired yet");
  });

  it("should be able to withdraw after withdraw delay is expired", async () => {
    const minStakingPeriod = 1;
    const withdrawDelay = 1;
    await setupContracts({ minStakingPeriod, withdrawDelay });
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });
    await stakingPool.connect(patron).requestWithdraw();
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * withdrawDelay) });

    const withdrawn = waitFor(
      stakingPool.filters.StakeWithdrawn(await patron.getAddress(), null),
      stakingPool
    );
    stakingPool.connect(patron).withdraw()

    return expect(withdrawn).fulfilled;
  });

  it("stake withdrawal should reduce total stake", async () => {
    const minStakingPeriod = 1;
    const withdrawDelay = 1;
    await setupContracts({ minStakingPeriod, withdrawDelay });
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    expect((await stakingPool.totalStake()).eq(principal.add(amount))).true;

    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });
    await stakingPool.connect(patron).requestWithdraw();
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * withdrawDelay) });
    await stakingPool.connect(patron).withdraw();

    expect((await stakingPool.totalStake()).eq(principal)).true;
  })

  it("should not be possible to repeat withdraw", async () => {
    const minStakingPeriod = 1;
    const withdrawDelay = 1;
    await setupContracts({ minStakingPeriod, withdrawDelay });
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });
    await stakingPool.connect(patron).requestWithdraw();
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * withdrawDelay) });

    await stakingPool.connect(patron).withdraw();

    return expect(stakingPool.connect(patron).withdraw())
      .rejectedWith("StakingPool: Stake hasn't requested to withdraw");
  });
}