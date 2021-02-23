/**
 * TODO:
 * - Test full "migration" of resolver data
 * - Test for other contract reading issuer struct
 */

import hre from "hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractFactory, utils } from "ethers";
import { ENSRegistry } from "../typechain/ENSRegistry";
import { RoleDefinitionResolver } from "../typechain/RoleDefinitionResolver";

chai.use(chaiAsPromised);
const expect = chai.expect;

const hashLabel = (label: string): string => utils.keccak256(utils.toUtf8Bytes(label));

const orgLabels = ["myorg", "iam", "ewc"];
const orgDomain = orgLabels.join(".");
const orgNode = utils.namehash(orgDomain);
const roleLabel = "user";
const roleLabelHash = hashLabel(roleLabel);
const roleNode = utils.namehash(`${roleLabel}.${orgDomain}`);

const defaultString = "0x".padEnd(64 + "0x".length, "0");

let ENS: ContractFactory;
let RoleDefinitionResolverFactory: ContractFactory;
let ens: ENSRegistry;
let roleDefinitionResolver: RoleDefinitionResolver;
let accounts: SignerWithAddress[];
let rootOwner: SignerWithAddress;

before(async () => {
  ENS = await hre.ethers.getContractFactory("ENSRegistry");
  RoleDefinitionResolverFactory = await hre.ethers.getContractFactory("RoleDefinitionResolver");
  accounts = await hre.ethers.getSigners();
  rootOwner = accounts[0];
});

beforeEach(async () => {
  // Deploy contracts
  ens = await ENS.deploy() as ENSRegistry;
  await ens.deployed();
  roleDefinitionResolver = await RoleDefinitionResolverFactory.deploy(ens.address) as RoleDefinitionResolver;
  await roleDefinitionResolver.deployed();

  // Set owner of "organization" node
  // https://docs.ens.domains/contract-api-reference/name-processing#terminology
  // https://eips.ethereum.org/EIPS/eip-137#namehash-algorithm
  const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
  let label = orgLabels[orgLabels.length - 1];
  await ens.setSubnodeOwner(rootNameHash, hashLabel(label), rootOwner.address);
  let domain = label;
  for (let i = orgLabels.length - 2; i >= 0; i--) {
    label = orgLabels[i];
    await ens.setSubnodeOwner(utils.namehash(domain), hashLabel(label), rootOwner.address);
    domain = label.concat(".", domain);
  }
  expect(await ens.owner(utils.namehash(orgDomain))).to.equal(rootOwner.address);

  // Set owner of "role" node
  await ens.setSubnodeOwner(orgNode, roleLabelHash, rootOwner.address);
  expect(await ens.owner(roleNode)).to.equal(rootOwner.address);
});

describe("upgrading resolver", async () => {
  it("org owner can take over ownership", async () => {
    const roleOwner = accounts[1];
    const anotherRoleDefResolver = await RoleDefinitionResolverFactory.deploy(ens.address) as RoleDefinitionResolver;
    await anotherRoleDefResolver.deployed();

    // Give ownership of role node to another account
    await ens.setSubnodeOwner(orgNode, roleLabelHash, roleOwner.address);
    expect(await ens.owner(roleNode)).to.equal(roleOwner.address);

    // This "roleOwner" account can set the resolver
    await ens.connect(roleOwner).setResolver(roleNode, roleDefinitionResolver.address);
    expect(await ens.resolver(roleNode)).to.equal(roleDefinitionResolver.address);

    // Confirm that the roleOwner can make some change to the resolver
    await roleDefinitionResolver.connect(roleOwner).setText(roleNode, "roleType", "org");
    expect(await roleDefinitionResolver.text(roleNode, "roleType")).to.equal("org");

    // The rootOwner can't set the resolver or update the resolver data
    await expect(ens.setResolver(roleNode, anotherRoleDefResolver.address)).to.eventually.be.rejected;
    await expect(roleDefinitionResolver.setText(roleNode, "roleType", "app")).to.eventually.be.rejected;

    // However rootOwner can take back the node, then update the resolver
    await ens.setSubnodeOwner(orgNode, roleLabelHash, rootOwner.address);
    await ens.setResolver(roleNode, anotherRoleDefResolver.address);
    expect(await ens.resolver(roleNode)).to.equal(anotherRoleDefResolver.address);
  });
});

describe('issuers', async () => {
  beforeEach(async () => {
    expect(await ens.owner(roleNode)).to.equal(rootOwner.address);
  });

  it('permits setting issuer dids by owner', async () => {
    const dids = ['0xC7010B2e2408847760bF18E695Ba3aFf02299a3b']; // Arbitrary address
    await roleDefinitionResolver.setIssuerDids(roleNode, dids);
    const issuers = await roleDefinitionResolver.issuers(roleNode);
    expect(issuers.dids).to.eql(dids);
    expect(issuers.role).to.equal(defaultString);
  });
});

describe("supportsInterface function", async () => {
  xit("supports known interfaces", async () => {
    // TODO: add new interfaces
    // e.g. assert.equal(await resolver.supportsInterface("0x3b3b57de"), true);
  });

  it("does not support a random interface", async () => {
    expect(await roleDefinitionResolver.supportsInterface("0x3b3b57df")).to.be.false;
  });
});