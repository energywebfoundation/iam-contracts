import hre from "hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractFactory, ContractTransaction, utils } from "ethers";
import { ENSRegistry } from "../typechain/ENSRegistry";
import { RoleDefinitionResolver } from "../typechain/RoleDefinitionResolver";

chai.use(chaiAsPromised);
const expect = chai.expect;

const hashLabel = (label: string): string => utils.keccak256(utils.toUtf8Bytes(label));
const getTransactionEventArgs = async (tx: ContractTransaction) => {
  const receipt = await tx.wait();
  if (!receipt.events) {
    throw new Error("receipt should contain events");
  }
  expect(receipt.events.length).to.equal(1);
  const eventArgs = receipt.events[0].args;
  return eventArgs;
}

const ewcDomain = "ewc";
const ewcLabelHash = hashLabel(ewcDomain);
const ewcNode = utils.namehash(ewcDomain);

const iamLabel = "iam";
const iamLabelHash = hashLabel(iamLabel);
const iamDomain = `${iamLabel}.${ewcDomain}`;
const iamNode = utils.namehash(iamDomain);

const orgLabel = "myorg";
const orgLabelHash = hashLabel(orgLabel);
const orgDomain = `${orgLabel}.${iamDomain}`;
const orgNode = utils.namehash(orgDomain);

const roleLabel = "user";
const roleLabelHash = hashLabel(roleLabel);
const roleDomain = `${roleLabel}.${orgDomain}`;
const roleNode = utils.namehash(`${roleDomain}`);

const solidityDefaultString = "0x".padEnd(64 + "0x".length, "0");

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

  // Set owner of "role" node hierarchy
  // https://docs.ens.domains/contract-api-reference/name-processing#terminology
  // https://eips.ethereum.org/EIPS/eip-137#namehash-algorithm
  const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
  await ens.setSubnodeOwner(rootNameHash, ewcLabelHash, rootOwner.address);
  await ens.setSubnodeOwner(ewcNode, iamLabelHash, rootOwner.address);
  await ens.setSubnodeOwner(iamNode, orgLabelHash, rootOwner.address);
  await ens.setSubnodeOwner(orgNode, roleLabelHash, rootOwner.address);
  expect(await ens.owner(roleNode)).to.equal(rootOwner.address);
});

describe("upgrading resolver", async () => {
  it("org owner can take over ownership", async () => {
    const roleOwner = accounts[1];
    const anotherRoleDefResolver = await RoleDefinitionResolverFactory.deploy(ens.address) as RoleDefinitionResolver;
    await anotherRoleDefResolver.deployed();

    // Give ownership of org and role node to another account
    await ens.setOwner(roleNode, roleOwner.address);
    expect(await ens.owner(roleNode)).to.equal(roleOwner.address);
    await ens.setOwner(orgNode, roleOwner.address);
    expect(await ens.owner(orgNode)).to.equal(roleOwner.address);

    // This "roleOwner" account can set the resolver
    await ens.connect(roleOwner).setResolver(roleNode, roleDefinitionResolver.address);
    expect(await ens.resolver(roleNode)).to.equal(roleDefinitionResolver.address);

    // Confirm that the roleOwner can make some change to the resolver
    await roleDefinitionResolver.connect(roleOwner).setText(roleNode, "roleType", "org");
    expect(await roleDefinitionResolver.text(roleNode, "roleType")).to.equal("org");

    // The rootOwner can't set the resolver or update the resolver data
    await expect(ens.setResolver(roleNode, anotherRoleDefResolver.address)).to.eventually.be.rejected;
    await expect(roleDefinitionResolver.setText(roleNode, "roleType", "app")).to.eventually.be.rejected;

    // rootOwner can't directly take back the role node as they don't own the org
    await expect(ens.setSubnodeOwner(orgNode, roleLabelHash, rootOwner.address)).to.eventually.be.rejected;
    await expect(ens.setOwner(roleNode, rootOwner.address)).to.eventually.be.rejected;

    // However rootOwner can take back the org node, then the role node, then update the resolver
    await ens.setSubnodeOwner(iamNode, orgLabelHash, rootOwner.address);
    await ens.setSubnodeOwner(orgNode, roleLabelHash, rootOwner.address);
    await ens.setResolver(roleNode, anotherRoleDefResolver.address);
    expect(await ens.resolver(roleNode)).to.equal(anotherRoleDefResolver.address);
  });
});

describe('issuers', async () => {
  const dids = ['0xC7010B2e2408847760bF18E695Ba3aFf02299a3b']; // Arbitrary address
  const anotherRoleNode = utils.namehash("anotherRole.anotherOrg.iam.ewc");

  it('permits setting issuer dids by owner', async () => {
    const tx = await roleDefinitionResolver.setIssuerDids(roleNode, dids);
    const issuers = await roleDefinitionResolver.issuers(roleNode);
    expect(issuers.dids).to.eql(dids);
    expect(issuers.role).to.equal(solidityDefaultString, "role should be cleared when setting dids");

    const eventArgs = await getTransactionEventArgs(tx);
    expect(eventArgs.newIssuers.dids).to.eql(dids);
    expect(eventArgs.newIssuers.role).to.equal(solidityDefaultString);
    expect(eventArgs.node).to.equal(roleNode);
  });

  it('permits updating issuer dids by owner', async () => {
    await roleDefinitionResolver.setIssuerDids(roleNode, dids);
    const issuers = await roleDefinitionResolver.issuers(roleNode);
    expect(issuers.dids).to.eql(dids);

    const moreDids = dids.concat('0xA0B7BD5BFafcEdB39849c9159a2487C0d0d79301');
    await roleDefinitionResolver.setIssuerDids(roleNode, moreDids);
    const issuersWithMoreDids = await roleDefinitionResolver.issuers(roleNode);
    expect(issuersWithMoreDids.dids).to.eql(moreDids);
  });

  it('permits setting issuer role by owner', async () => {
    const tx = await roleDefinitionResolver.setIssuerRole(roleNode, anotherRoleNode);
    const issuers = await roleDefinitionResolver.issuers(roleNode);
    expect(issuers.role).to.equal(anotherRoleNode);
    expect(issuers.dids.length).to.equal(0, "dids should be cleared when setting the role");

    const eventArgs = await getTransactionEventArgs(tx);
    expect(eventArgs.newIssuers.dids).to.eql([]);
    expect(eventArgs.newIssuers.role).to.equal(anotherRoleNode);
    expect(eventArgs.node).to.equal(roleNode);
  });

  it('prevents updating issuers by non-owner', async () => {
    await expect(roleDefinitionResolver.connect(accounts[1]).setIssuerDids(roleNode, dids)).to.eventually.be.rejected;
    await expect(roleDefinitionResolver.connect(accounts[1]).setIssuerRole(roleNode, anotherRoleNode)).to.eventually.be.rejected;
  });
});

describe('versionNumbers', async () => {
  it('permits setting version number by owner', async () => {
    const initialVersionNumber = await roleDefinitionResolver.versionNumber(roleNode);
    expect(initialVersionNumber).to.equal(0, "version numbers should initialized to zero")
    const newVersionNumber = initialVersionNumber + 1;
    const tx = await roleDefinitionResolver.setVersionNumber(roleNode, newVersionNumber);
    const changedVersionNumber = await roleDefinitionResolver.versionNumber(roleNode);
    expect(changedVersionNumber).to.equal(newVersionNumber);

    const eventArgs = await getTransactionEventArgs(tx);
    expect(eventArgs.newVersion).to.equal(newVersionNumber);
    expect(eventArgs.node).to.equal(roleNode);
  });

  it('prevents updating version number by non-owner', async () => {
    await expect(roleDefinitionResolver.connect(accounts[1]).setVersionNumber(roleNode, 10)).to.eventually.be.rejected;
  });
});

describe('issuerTypes', async () => {
  it('permits setting issuer type by owner', async () => {
    const initialType = await roleDefinitionResolver.issuerType(roleNode);
    expect(initialType).to.equal(0, "issuer types should initialized to zero")
    const newType = 1;
    const tx = await roleDefinitionResolver.setIssuerType(roleNode, newType);
    const changedType = await roleDefinitionResolver.issuerType(roleNode);
    expect(changedType).to.equal(newType);

    const eventArgs = await getTransactionEventArgs(tx);
    expect(eventArgs.newType).to.equal(newType);
    expect(eventArgs.node).to.equal(roleNode);
  });

  it('prevents updating version number by non-owner', async () => {
    await expect(roleDefinitionResolver.connect(accounts[1]).setIssuerType(roleNode, 10)).to.eventually.be.rejected;
  });
});


describe("supportsInterface function", async () => {
  it("supports interfaces of new resolver profiles", async () => {
    expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('versionNumber(bytes32)'))).to.be.true;
    expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('issuerType(bytes32)'))).to.be.true;
    expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('issuers(bytes32)'))).to.be.true;
    expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('requiresConditionType(bytes32,uint256)'))).to.be.true;
    expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('prerequisiteRoles(bytes32)'))).to.be.true;
  });

  it("supports interfaces of resolver profiles from PublicResolver", async () => {
    expect(await roleDefinitionResolver.supportsInterface('0x59d1d43c')).to.be.true; //TextResolver
    expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('interfaceImplementer(bytes32,bytes4)'))).to.be.true; // InterfaceResolver
  });

  it("does not support a random interface", async () => {
    expect(await roleDefinitionResolver.supportsInterface("0x3b3b57df")).to.be.false;
  });

  describe("computeInterfaceId function", async () => {
    it("correctly computes known interfaceIds", async () => {
      // https://eips.ethereum.org/EIPS/eip-165#how-a-contract-will-publish-the-interfaces-it-implements
      expect(computeInterfaceId('supportsInterface(bytes4)')).to.equal('0x01ffc9a7');

      // TextResolver
      expect(computeInterfaceId('text(bytes32,string)')).to.equal('0x59d1d43c');
    });
  })

  const computeInterfaceId = (contractInterface: string) => {
    return utils.solidityKeccak256(['string'], [contractInterface])
      .slice(0, 10); //10 <- |0x + bytes4|
  }
});