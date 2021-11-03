//deploy proxy for ClaimManager
import { deployProxy, upgradeProxy } from "@openzeppelin/truffle-upgrades";
import { ClaimManager } from "../ethers/ClaimManager";
import { contract } from "truffle";
import { deployer } from "@truffle/deployer";

const claimManager = contract(ClaimManager);
export async function deployClaimManager(erc1056: string, ensRegistry: string) {
  await deployProxy(claimManager, [erc1056, ensRegistry], {
    deployer,
    initializer: "initialize",
  });
}
