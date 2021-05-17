import { ContractFactory } from 'ethers';
import { setRegistryAddress, addKnownResolver, setDomainNotifier, setPrimaryResolver } from '../src/resolverConfig'
import { getSubdomainsUsingResolver } from '../src/getSubDomains';
import { DomainTransactionFactory, EncodedCall, IRoleDefinition, ResolverContractType } from '../src';
import { ENSRegistry } from '../typechain/ENSRegistry';
import { RoleDefinitionResolver } from '../typechain/RoleDefinitionResolver';
import { DomainNotifier } from '../typechain/DomainNotifier';
import { PublicResolver } from '../typechain/PublicResolver';
import { JsonRpcProvider, JsonRpcSigner } from "ethers/providers";
import { hashLabel } from './iam-contracts.test';
import { namehash } from 'ethers/utils';
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
let owner: JsonRpcSigner;
let provider: JsonRpcProvider;
let chainId: number;

const domain = "ewc";
const node = namehash(domain);

const addSubdomain = async (parentDomain: string, label: string, resolverType: "PUBLIC" | "ROLEDEF") => {
  const rootNode = namehash(parentDomain);
  const subdomain = `${label}.${parentDomain}`
  const subNode = namehash(subdomain);
  await ensRegistry.setSubnodeOwner(rootNode, hashLabel(label), await owner.getAddress());
  let call: EncodedCall
  if (resolverType === "ROLEDEF") {
    await ensRegistry.setResolver(subNode, ensRoleDefResolver.address);
    const domainDefTxFactory = new DomainTransactionFactory(provider, chainId);
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

      setRegistryAddress({ chainId, address: ensRegistry.address });
      setDomainNotifier({ chainId, address: domainNotifier.address });
      setPrimaryResolver({ chainId, type: ResolverContractType.RoleDefinitionResolver_v1, address: ensRoleDefResolver.address })
      setPrimaryResolver({ chainId, type: ResolverContractType.PublicResolver, address: ensPublicResolver.address })
      addKnownResolver({ chainId, address: ensRoleDefResolver.address, type: ResolverContractType.RoleDefinitionResolver_v1 });
      addKnownResolver({ chainId, address: ensPublicResolver.address, type: ResolverContractType.PublicResolver });

      // Register and set resolver for parent node
      const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      await ensRegistry.setSubnodeOwner(rootNameHash, hashLabel(domain), await owner.getAddress());
      expect(await ensRegistry.owner(node)).to.equal(await owner.getAddress());
      await ensRegistry.setResolver(node, ensRoleDefResolver.address);
      const domainDefTxFactory = new DomainTransactionFactory(provider, chainId);
      const call = domainDefTxFactory.newRole({ domain: domain, roleDefinition: role });
      await (await owner.sendTransaction(call)).wait()
    });

    it("returns subdomains using RoleDefResolver", async () => {
      await Promise.all([addSubdomain("ewc", "test", "ROLEDEF"), addSubdomain("ewc", "iam", "ROLEDEF")]);
      const subDomains = await getSubdomainsUsingResolver({
        domain: domain,
        ensRegistry: ensRegistry,
        provider,
        chainId,
        mode: "ALL"
      })
      expect(subDomains.length).to.equal(2);
    });

    it("returns subdomains using PublicResolver", async () => {
      await Promise.all([addSubdomain("ewc", "test", "PUBLIC"), addSubdomain("ewc", "iam", "PUBLIC")]);
      const subDomains = await getSubdomainsUsingResolver({
        domain: domain,
        ensRegistry: ensRegistry,
        provider,
        chainId,
        mode: "ALL"
      })
      expect(subDomains.length).to.equal(2);
    });

    it("returns subdomains using PublicResolver and RoleDefResolver", async () => {
      await Promise.all([addSubdomain("ewc", "test", "ROLEDEF"), addSubdomain("ewc", "iam", "PUBLIC")]);
      const subDomains = await getSubdomainsUsingResolver({
        domain: domain,
        ensRegistry: ensRegistry,
        provider,
        chainId,
        mode: "ALL"
      })
      expect(subDomains.length).to.equal(2);
    });

    // TODO: Test multi-level
  });
}