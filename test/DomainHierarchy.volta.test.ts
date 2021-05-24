import { providers } from 'ethers';
import { ENSRegistry__factory } from '../typechain/factories/ENSRegistry__factory'
import { VOLTA_DOMAIN_NOTIFER_ADDRESS, VOLTA_ENS_REGISTRY_ADDRESS, VOLTA_PUBLIC_RESOLVER_ADDRESS } from '../src/chainConstants'
import { DomainHierarchy } from '../src/DomainHierarchy';
import { DomainReader } from '../src';

const { JsonRpcProvider } = providers;

/**
 * This test suite is to retrieval of the suddomains actually
 * on Volta. Not intended to be run during CI/CD
 */
xdescribe('[getSubDomains]', async function () {
  this.timeout(0);
  const provider = new JsonRpcProvider('https://volta-rpc.energyweb.org');

  const ensRegistry = ENSRegistry__factory.connect(VOLTA_ENS_REGISTRY_ADDRESS, provider)
  const domainReader = new DomainReader({ ensRegistryAddress: VOLTA_ENS_REGISTRY_ADDRESS, provider })
  const domainHierarchy = new DomainHierarchy({
    domainReader,
    ensRegistry,
    provider,
    domainNotifierAddress: VOLTA_DOMAIN_NOTIFER_ADDRESS,
    publicResolverAddress: VOLTA_PUBLIC_RESOLVER_ADDRESS
  })

  const domain = "iam.ewc";
  let subDomains;
  let subDomains_usingRegistry;

  it("getSubdomains", async () => {
    subDomains = await domainHierarchy.getSubdomainsUsingResolver({
      domain: domain,
      mode: "ALL"
    })
    console.log(subDomains.length)

    const subDomains2 = await domainHierarchy.getSubdomainsUsingResolver({
      domain: domain,
      mode: "FIRSTLEVEL"
    })
    console.log(subDomains2.length)
  })

  it("getSubdomains using ENS Registry", async () => {
    subDomains_usingRegistry = await domainHierarchy.getSubdomainsUsingRegistry({
      domain: domain,
    })
    console.log(subDomains_usingRegistry.length)
  })
});
