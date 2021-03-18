import { Wallet } from "ethers";
import { keccak256, namehash, toUtf8Bytes } from "ethers/utils";
import { deployContracts, GANACHE_PORT, ensRegistry, ensRoleDefResolver, provider } from "./setup_contracts";
import { RoleDefinitionReader } from "../src/RoleDefinitionReader";
import { DomainDefinitionTransactionFactory } from "../src/DomainDefinitionTransactionFactory"
import { IRoleDefinition, PreconditionTypes } from "../src/types/DomainDefinitions";

let wallet = Wallet.createRandom()
wallet = wallet.connect(provider)

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

    const domainDefTxFactory = new DomainDefinitionTransactionFactory(ensRoleDefResolver);
    const call = domainDefTxFactory.newRole({ domain: roleDomain, roleDefinition: data });
    await (await wallet.sendTransaction(call)).wait()

    // for await (const call of tx.calls) {
    //   await (await this._signer.sendTransaction({ ...call, ...this._transactionOverrides })).wait();
    // }

    const roleDefinitionReader = new RoleDefinitionReader(ensRoleDefResolver.address, wallet)
    const roleDef = await roleDefinitionReader.read(roleNode);

    expect(roleDef).toMatchObject<IRoleDefinition>(data);

    const reverseName = await ensRoleDefResolver.name(roleNode);
    expect(reverseName).toEqual(roleDomain);
  });
});
