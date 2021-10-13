import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractFactory, ContractTransaction, providers, utils, BigNumber } from "ethers";
import { ENSRegistry } from "../ethers/ENSRegistry";
import { RoleDefinitionResolverV2 } from "../ethers/RoleDefinitionResolverV2";
import { RoleDefinitionResolverV2__factory } from "../ethers/factories/RoleDefinitionResolverV2__factory";
import { DomainNotifier } from "../ethers/DomainNotifier";

chai.use(chaiAsPromised);
const expect = chai.expect;

const hashLabel = (label: string): string => utils.keccak256(utils.toUtf8Bytes(label));

const getTransactionEventArgs = async (tx: ContractTransaction) => {
  const receipt = await tx.wait();
  if (!receipt.events) {
    throw new Error("receipt should contain events");
  }
  expect(receipt.events.length).to.equal(1);
  const event = receipt.events[0];
  return event as IEvent;
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

let ensFactory: ContractFactory;
let domainNotifierFactory: ContractFactory;
let ens: ENSRegistry;
let roleDefinitionResolver: RoleDefinitionResolverV2;
let domainNotifier: DomainNotifier;
let owner: providers.JsonRpcSigner;
let ownerAddr: string;
let anotherAccount: providers.JsonRpcSigner;

interface IEvent {
  topics: string[],
  args: {
    newIssuers?: any[]
    node?: string,
    newPrerequisiteRoles?: string[],
    newType?: string,
    newVersion?: BigNumber
  }
}

export function roleDefinitionResolverTestSuite(): void {

  before(async function () {
    ({
      ensFactory, domainNotifierFactory, owner, anotherAccount
    } = this);
    ownerAddr = await owner.getAddress();
  });

  beforeEach(async () => {
    // Deploy contracts
    ens = await ensFactory.deploy() as ENSRegistry;
    await ens.deployed();
    domainNotifier = await domainNotifierFactory.deploy(ens.address) as DomainNotifier;
    await domainNotifier.deployed();
    roleDefinitionResolver = await new RoleDefinitionResolverV2__factory(owner).deploy(ens.address, domainNotifier.address);
    await roleDefinitionResolver.deployed();

    // Set owner of "role" node hierarchy
    // https://docs.ens.domains/contract-api-reference/name-processing#terminology
    // https://eips.ethereum.org/EIPS/eip-137#utils.namehash-algorithm
    const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    await ens.setSubnodeOwner(rootNameHash, ewcLabelHash, ownerAddr);
    const ewcOwner = await ens.owner(ewcNode)
    expect(ewcOwner).to.equal(ownerAddr);
    await ens.setSubnodeOwner(ewcNode, iamLabelHash, ownerAddr);
    await ens.setSubnodeOwner(iamNode, orgLabelHash, ownerAddr);
    await ens.setSubnodeOwner(orgNode, roleLabelHash, ownerAddr);
    expect(await ens.owner(roleNode)).to.equal(ownerAddr);
  });

  describe("upgrading resolver", async () => {
    it("org owner can take over ownership", async () => {
      const roleOwner = anotherAccount;
      const roleOwnerAddr = await roleOwner.getAddress();
      const anotherRoleDefResolver = await new RoleDefinitionResolverV2__factory(owner).deploy(ens.address, domainNotifier.address);
      await anotherRoleDefResolver.deployed();

      // Give ownership of org and role node to another account
      await ens.setOwner(roleNode, roleOwnerAddr);
      expect(await ens.owner(roleNode)).to.equal(roleOwnerAddr);
      await ens.setOwner(orgNode, roleOwnerAddr);
      expect(await ens.owner(orgNode)).to.equal(roleOwnerAddr);

      // This "roleOwner" account can set the resolver
      await ens.connect(roleOwner).setResolver(roleNode, roleDefinitionResolver.address);
      expect(await ens.resolver(roleNode)).to.equal(roleDefinitionResolver.address);

      // Confirm that the roleOwner can make some change to the resolver
      await roleDefinitionResolver.connect(roleOwner).setText(roleNode, "roleType", "org");
      expect(await roleDefinitionResolver.text(roleNode, "roleType")).to.equal("org");

      // The owner can't set the resolver or update the resolver data
      await expect(ens.setResolver(roleNode, anotherRoleDefResolver.address)).to.eventually.be.rejected;
      await expect(roleDefinitionResolver.setText(roleNode, "roleType", "app")).to.eventually.be.rejected;

      // owner can't directly take back the role node as they don't own the org
      await expect(ens.setSubnodeOwner(orgNode, roleLabelHash, ownerAddr)).to.eventually.be.rejected;
      await expect(ens.setOwner(roleNode, ownerAddr)).to.eventually.be.rejected;

      // However owner can take back the org node, then the role node, then update the resolver
      await ens.setSubnodeOwner(iamNode, orgLabelHash, ownerAddr);
      await ens.setSubnodeOwner(orgNode, roleLabelHash, ownerAddr);
      await ens.setResolver(roleNode, anotherRoleDefResolver.address);
      expect(await ens.resolver(roleNode)).to.equal(anotherRoleDefResolver.address);
    });
  });

  describe('domain delegation', async () => {
    it('permits delegation of role creation', async () => {
      const delegate = anotherAccount;
      const delegateAddress = await delegate.getAddress();
      // Add delegate and "create" new role 
      const newRoleLabel = "newrole";
      const newRoleLabelHash = hashLabel(newRoleLabel);
      const newRoleDomain = `${newRoleLabel}.${orgDomain}`;
      const newRoleNode = utils.namehash(`${newRoleDomain}`);
      await ens.connect(owner).setApprovalForAll(delegateAddress, true);
      await ens.connect(delegate).setSubnodeOwner(orgNode, newRoleLabelHash, ownerAddr);
      await ens.connect(delegate).setResolver(newRoleNode, roleDefinitionResolver.address);
      expect(await ens.owner(newRoleNode)).to.equal(ownerAddr);
      // Set version number as test of a new resolver profile
      const newVersionNumber = 100;
      await roleDefinitionResolver.connect(delegate).setVersionNumber(roleNode, newVersionNumber);
      const changedVersionNumber = await roleDefinitionResolver.versionNumber(roleNode);
      expect(changedVersionNumber.toNumber()).to.equal(newVersionNumber);
      const newText = "new text";
      // Set text as test of PublicResolver profile
      const textKey = "metadata";
      await roleDefinitionResolver.connect(delegate).setText(roleNode, textKey, newText);
      const changedText = await roleDefinitionResolver.text(roleNode, textKey);
      expect(changedText).to.equal(newText);

      // Remove delegate and confirm that can not longer create role 
      const anotherRoleLabel = "anotherrole";
      const anotherRoleLabelHash = hashLabel(anotherRoleLabel);
      const anotherRoleDomain = `${anotherRoleLabel}.${orgDomain}`;
      const anotherRoleNode = utils.namehash(`${anotherRoleDomain}`);
      await ens.connect(owner).setApprovalForAll(delegateAddress, false);
      await expect(ens.connect(delegate).setSubnodeOwner(orgNode, anotherRoleLabelHash, ownerAddr)).to.eventually.be.rejected;
      await expect(ens.connect(delegate).setResolver(anotherRoleNode, roleDefinitionResolver.address)).to.eventually.be.rejected;
      await expect(roleDefinitionResolver.connect(delegate).setVersionNumber(roleNode, newVersionNumber + 1)).to.eventually.be.rejected;
      await expect(roleDefinitionResolver.connect(delegate).setText(roleNode, textKey, newText + "changed")).to.eventually.be.rejected;
    });
  });

  describe('domain updated notifications', async () => {
    it('permits triggering update event by owner', async () => {
      await ens.connect(owner).setResolver(roleNode, roleDefinitionResolver.address);
      const tx = await roleDefinitionResolver.domainUpdated(roleNode);
      const event = await getTransactionEventArgs(tx);
      expect(event.topics[1]).to.equal(roleNode);
    });

    it('prevents triggering update event directly', async () => {
      await expect(domainNotifier.connect(owner).domainUpdated(roleNode)).to.eventually.be.rejected;
    });

    it('prevents triggering update event by non-owner', async () => {
      await expect(roleDefinitionResolver.connect(anotherAccount).domainUpdated(roleNode)).to.eventually.be.rejected;
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

      const event = await getTransactionEventArgs(tx);
      expect(event.args.newIssuers ? event.args.newIssuers[0] : undefined).to.eql(dids);
      expect(event.args.newIssuers ? event.args.newIssuers[1] : undefined).to.equal(solidityDefaultString);
      expect(event.args.node).to.equal(roleNode);
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

      const event = await getTransactionEventArgs(tx);
      expect(event.args.newIssuers ? event.args.newIssuers[0] : undefined).to.eql([]);
      expect(event.args.newIssuers ? event.args.newIssuers[1] : undefined).to.equal(anotherRoleNode);
      expect(event.args.node).to.equal(roleNode);
    });

    it('prevents updating issuers by non-owner', async () => {
      await expect(roleDefinitionResolver.connect(anotherAccount).setIssuerDids(roleNode, dids)).to.eventually.be.rejected;
      await expect(roleDefinitionResolver.connect(anotherAccount).setIssuerRole(roleNode, anotherRoleNode)).to.eventually.be.rejected;
    });
  });

  describe('versionNumbers', async () => {
    it('permits setting version number by owner', async () => {
      const initialVersionNumber = await roleDefinitionResolver.versionNumber(roleNode);
      expect(initialVersionNumber.toNumber()).to.equal(0, "version numbers should initialized to 0")
      const newVersionNumber = 1
      const tx = await roleDefinitionResolver.setVersionNumber(roleNode, newVersionNumber);
      const changedVersionNumber = await roleDefinitionResolver.versionNumber(roleNode);
      expect(changedVersionNumber.toNumber()).to.equal(newVersionNumber);

      const event = await getTransactionEventArgs(tx);
      expect(event.args?.newVersion?.toNumber()).to.equal(newVersionNumber);
      expect(event.args?.node).to.equal(roleNode);
    });

    it('prevents updating version number by non-owner', async () => {
      await expect(roleDefinitionResolver.connect(anotherAccount).setVersionNumber(roleNode, 2)).to.eventually.be.rejected;
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

      const event = await getTransactionEventArgs(tx);
      expect(event.args?.newType).to.equal(newType);
      expect(event.args?.node).to.equal(roleNode);
    });

    it('prevents updating version number by non-owner', async () => {
      await expect(roleDefinitionResolver.connect(anotherAccount).setIssuerType(roleNode, 10)).to.eventually.be.rejected;
    });
  });

  describe('enrolmentPrerequisiteRoles', async () => {
    it('permits setting prerequisite roles by owner', async () => {
      const initialRoles = await roleDefinitionResolver.prerequisiteRoles(roleNode);
      expect(initialRoles[0]).to.be.empty; // role names array should be empty
      expect(initialRoles[1]).to.be.false; // mustHaveAll should be false 
      const newRoles = [utils.namehash("anotherRole.iam.ewc")];
      const mustHaveAll = true;
      const tx = await roleDefinitionResolver.setPrerequisiteRoles(roleNode, newRoles, mustHaveAll);
      const changedRoles = await roleDefinitionResolver.prerequisiteRoles(roleNode);
      expect(changedRoles[0]).to.eql(newRoles);
      expect(changedRoles[1]).to.eql(mustHaveAll);

      const event = await getTransactionEventArgs(tx);
      expect(event.args?.newPrerequisiteRoles?.[0]).to.eql(newRoles);
      expect(event.args?.newPrerequisiteRoles?.[1]).to.eql(mustHaveAll);
      expect(event.args?.node).to.equal(roleNode);
    });

    it('prevents updating prerequisite roles by non-owner', async () => {
      await expect(roleDefinitionResolver.connect(anotherAccount).setPrerequisiteRoles(roleNode, [], false)).to.eventually.be.rejected;
    });
  });

  describe("supportsInterface function", async () => {
    it("supports interfaces of new resolver profiles", async () => {
      expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('versionNumber(bytes32)'))).to.be.true;
      expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('issuerType(bytes32)'))).to.be.true;
      expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('issuers(bytes32)'))).to.be.true;
      expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('revokerType(bytes32)'))).to.be.true;
      expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('revokers(bytes32)'))).to.be.true;
      expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('prerequisiteRoles(bytes32)'))).to.be.true;
      expect(await roleDefinitionResolver.supportsInterface(computeInterfaceId('domainUpdated(bytes32)'))).to.be.true;
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
}
