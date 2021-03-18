import { Wallet } from "ethers";
import { deployContracts, GANACHE_PORT, ensRegistry, ensRoleDefResolver } from "./setup_contracts";
import { RoleDefinitionReader } from "../src/RoleDefinitionReader";
import { IRoleDefinition, PreconditionTypes } from "../src/types/IRoleDefinition";
import { keccak256, namehash, toUtf8Bytes } from "ethers/utils";

const wallet = Wallet.createRandom()

export const rpcUrl = `http://localhost:${GANACHE_PORT}`;

const hashLabel = (label: string): string => keccak256(toUtf8Bytes(label));
const roleDomain = "role1";
const roleNode = namehash(roleDomain);

describe("RoleDefinitionReader tests", () => {
  beforeAll(async () => {
    await deployContracts(wallet.privateKey);

    const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    await ensRegistry.setSubnodeOwner(rootNameHash, hashLabel(roleDomain), wallet.address);
    expect(await ensRegistry.owner(roleNode)).toEqual(wallet.address);
  });

  test("org role can be created", async () => {
    const data: IRoleDefinition = {
      fields: [],
      issuer: {
        issuerType: "DID",
        did: [`did:ethr:0x7aA65E31d404A8857BA083f6195757a730b51CFe`]
      },
      metadata: [],
      roleName: roleDomain,
      roleType: "test",
      version: "1.0.0",
      enrolmentPreconditions: [{
        type: PreconditionTypes.Role,
        conditions: [roleDomain] // Circular condition but sufficient for test
      }]
    };

    const

    const roleDef = await iam.getDefinition({
      namespace: roleDomain,
      type: ENSNamespaceTypes.Roles
    });
    expect(roleDef).toMatchObject<IRoleDefinition>(data);

    const reverseName = await ensRoleDefResolver.name(roleNode);
    expect(reverseName).toEqual(roleDomain);
  });
});
