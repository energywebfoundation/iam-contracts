import { Signer, utils } from "ethers";
import { expect } from "chai";
import { requestRole } from "../test_utils/role_utils";
import { claimManager, waitFor, ewc, patronRole, stakingPoolFactory, serviceProvider, org, minStakingPeriod, withdrawDelay, getSigner } from "./staking.testSuite";
import { StakingPool } from "../../ethers/StakingPool";
import { StakingPool__factory } from "../../ethers/factories/StakingPool__factory";

const { namehash, parseEther } = utils;

export function stakingPoolTests(): void {
  let patron: Signer;
  let stakingPool: StakingPool;
  const amount = parseEther("0.1");
  const version = 1;
  const patronRewardPortion = 80;
  const principal = parseEther("0.2");

  async function setupStakingPool(patronRoles = [patronRole]) {
    await (await stakingPoolFactory.connect(serviceProvider).launchStakingPool(
      namehash(org),
      minStakingPeriod,
      patronRewardPortion,
      patronRoles.map((r) => namehash(r)),
      { value: principal }
    )).wait();
    const stakingPoolAddr = (await stakingPoolFactory.services(namehash(org))).pool;
    stakingPool = new StakingPool__factory(patron).attach(stakingPoolAddr);
  }

  beforeEach(async () => {
    patron = await getSigner();
  });

  it("initial stakes consists only from principal", async () => {
    await setupStakingPool();
    expect((await stakingPool.totalStake()).eq(principal)).true;
  });

  it("should not be possible to put a stake without having patron role", async () => {
    await setupStakingPool();

    return expect(stakingPool.putStake({ value: amount }))
      .rejectedWith("StakingPool: patron is not registered with patron role");
  });

  it("should be possible to stake when no patron roles are required", async () => {
    await setupStakingPool([]);

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

  it("having patron role should be able to put a stake", async () => {
    await setupStakingPool();
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
    await setupStakingPool();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    expect((await stakingPool.totalStake()).eq(principal.add(amount))).true;
  })

  it("should not be possible to replenish stake", async () => {
    await setupStakingPool();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    return expect(stakingPool.connect(patron).putStake({ value: amount }))
      .rejectedWith("StakingPool: Replenishment of the stake is not allowed");
  });

  it("should not be possible to request withdraw before minimal staking period is expired", async () => {
    await setupStakingPool();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    return expect(stakingPool.connect(patron).requestWithdraw())
      .rejectedWith("StakingPool: Minimum staking period is not expired yet");
  });

  it("should be able to request withdraw after minimal staking period is expired", async () => {
    await setupStakingPool();
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
    await setupStakingPool();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });

    await stakingPool.connect(patron).requestWithdraw();

    return expect(stakingPool.connect(patron).requestWithdraw()).rejectedWith("StakingPool: No stake to withdraw");
  });

  it("should not be possible to withdraw before withdraw delay is expired", async () => {
    await setupStakingPool();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });
    await stakingPool.connect(patron).requestWithdraw();

    return expect(stakingPool.connect(patron).withdraw())
      .rejectedWith("StakingPool: Withdrawal delay hasn't expired yet");
  });

  it("should be able to withdraw after withdraw delay is expired", async () => {
    await setupStakingPool();
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
    await setupStakingPool();
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
    await setupStakingPool();
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