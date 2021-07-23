import { providers, Wallet, utils } from "ethers";
import { StakingPoolFactory__factory } from "../src";

const { JsonRpcProvider } = providers;
const { namehash, parseEther } = utils;

const provider = new JsonRpcProvider("");
const deployer = new Wallet("1aec3458500362c0a0f1772ab724a71b0f9d7da418a2d86d5954ab3f4b58ec4e").connect(provider);
const minStakingPeriod = 5;
const patronRewardPortion = 500;
const patronRoles: string[] = [];
const principal = parseEther("100");

async function deploy_staking_pool() {
  const stakingPoolFactory = new StakingPoolFactory__factory(deployer).attach(STAKING_POOL_FACTORY_FAST_REWARD);

  const org = "energyweb.iam.ewc";
  (await stakingPoolFactory.launchStakingPool(
    namehash(org),
    minStakingPeriod,
    patronRewardPortion,
    patronRoles.map((r) => namehash(r)),
    { value: principal }
  )).wait();
  const service = await stakingPoolFactory.services(namehash(org));
  console.log(">>> pool deployed on: ", service.pool);
}

deploy_staking_pool();
