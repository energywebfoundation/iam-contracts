import { ContractFactory, utils, providers } from 'ethers';
import { DomainHierarchy } from '../src/DomainHierarchy';
import { DomainReader, DomainTransactionFactory, EncodedCall, IRoleDefinition, ResolverContractType } from '../src';
import { ENSRegistry } from '../ethers-v4/ENSRegistry';
import { RoleDefinitionResolver } from '../ethers-v4/RoleDefinitionResolver';
import { DomainNotifier } from '../ethers-v4/DomainNotifier';
import { PublicResolver } from '../ethers-v4/PublicResolver';
import { hashLabel } from './iam-contracts.test';
import { expect } from 'chai';
import { LegacyDomainDefTransactionFactory } from './LegacyDomainDefTransactionFactory';

let ensFactory: ContractFactory;
let roleDefResolverFactory: ContractFactory;
let domainNotifierFactory: ContractFactory;
let publicResolverFactory: ContractFactory;
let ensRegistry: ENSRegistry;
let ensRoleDefResolver: RoleDefinitionResolver;
let domainNotifier: DomainNotifier;
let ensPublicResolver: PublicResolver;
let owner: providers.JsonRpcSigner;
let provider: providers.JsonRpcProvider;
let chainId: number;

let domainReader: DomainReader;
let domainHierarchy: DomainHierarchy;

const domain = "ewc";
const node = utils.namehash(domain);

const addSubdomain = async (parentDomain: string, label: string, resolverType: "PUBLIC" | "ROLEDEF") => {
  const rootNode = utils.namehash(parentDomain);
  const subdomain = `${label}.${parentDomain}`
  const subNode = utils.namehash(subdomain);
  await ensRegistry.setSubnodeOwner(rootNode, hashLabel(label), await owner.getAddress());
  let call: EncodedCall
  if (resolverType === "ROLEDEF") {
    await ensRegistry.setResolver(subNode, ensRoleDefResolver.address);
    const domainDefTxFactory = new DomainTransactionFactory({ domainResolverAddress: ensRoleDefResolver.address });
    call = domainDefTxFactory.newRole({ domain: subdomain, roleDefinition: role });
  }
  else {
    await ensRegistry.setResolver(subNode, ensPublicResolver.address);
    const legacyDomainFactory = new LegacyDomainDefTransactionFactory(ensPublicResolver)
    call = legacyDomainFactory.newRole({ domain: subdomain, roleDefinition: role });
  }
  await (await owner.sendTransaction(call)).wait()
}

const role: IRoleDefinition = {
  fields: [],
  issuer: {
    issuerType: "DID",
    did: [`did:ethr:0x7aA65E31d404A8857BA083f6195757a730b51CFe`]
  },
  metadata: [],
  roleName: "myRole",
  roleType: "test",
  version: 1,
  enrolmentPreconditions: []
};

export function getSubDomainsTestSuite(): void {
  describe("getSubDomains tests", () => {
    before(async function () {
      ({
        publicResolverFactory, roleDefResolverFactory, ensFactory, domainNotifierFactory, provider, owner, chainId
      } = this);
    });

    beforeEach(async () => {
      ensRegistry = await ensFactory.deploy() as ENSRegistry;
      await ensRegistry.deployed();
      domainNotifier = await domainNotifierFactory.deploy(ensRegistry.address) as DomainNotifier;
      await domainNotifier.deployed();
      ensRoleDefResolver = await roleDefResolverFactory.deploy(ensRegistry.address, domainNotifier.address) as RoleDefinitionResolver;
      await ensRoleDefResolver.deployed();
      ensPublicResolver = await publicResolverFactory.deploy(ensRegistry.address) as PublicResolver;
      await ensRoleDefResolver.deployed();

      domainReader = new DomainReader({ ensRegistryAddress: ensRegistry.address, provider });
      domainReader.addKnownResolver({ chainId, address: ensRoleDefResolver.address, type: ResolverContractType.RoleDefinitionResolver_v1 });
      domainReader.addKnownResolver({ chainId, address: ensPublicResolver.address, type: ResolverContractType.PublicResolver });

      domainHierarchy = new DomainHierarchy({
        domainReader,
        provider,
        ensRegistry,
        domainNotifierAddress: domainNotifier.address,
        publicResolverAddress: ensPublicResolver.address
      })

      // Register and set resolver for parent node
      const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      await ensRegistry.setSubnodeOwner(rootNameHash, hashLabel(domain), await owner.getAddress());
      expect(await ensRegistry.owner(node)).to.equal(await owner.getAddress());
      await ensRegistry.setResolver(node, ensRoleDefResolver.address);
      const domainDefTxFactory = new DomainTransactionFactory({ domainResolverAddress: ensRoleDefResolver.address });
      const call = domainDefTxFactory.newRole({ domain: domain, roleDefinition: role });
      await (await owner.sendTransaction(call)).wait()
    });

    it("returns subdomains using RoleDefResolver", async () => {
      await Promise.all([addSubdomain("ewc", "test", "ROLEDEF"), addSubdomain("ewc", "iam", "ROLEDEF")]);
      const subDomains = await domainHierarchy.getSubdomainsUsingResolver({
        domain: domain,
        mode: "ALL"
      })
      expect(subDomains.length).to.equal(2);
    });

    it("returns subdomains using PublicResolver", async () => {
      await Promise.all([addSubdomain("ewc", "test", "PUBLIC"), addSubdomain("ewc", "iam", "PUBLIC")]);
      const subDomains = await domainHierarchy.getSubdomainsUsingResolver({
        domain: domain,
        mode: "ALL"
      })
      expect(subDomains.length).to.equal(2);
    });

    it("returns subdomains using PublicResolver and RoleDefResolver", async () => {
      await Promise.all([addSubdomain("ewc", "test", "ROLEDEF"), addSubdomain("ewc", "iam", "PUBLIC")]);
      const subDomains = await domainHierarchy.getSubdomainsUsingResolver({
        domain: domain,
        mode: "ALL"
      })
      expect(subDomains.length).to.equal(2);
    });

    // TODO: Test multi-level
  });
}