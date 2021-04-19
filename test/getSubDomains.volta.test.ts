import { providers } from 'ethers';
import { PublicResolver__factory } from '../typechain/factories/PublicResolver__factory'
import { ENSRegistry__factory } from '../typechain/factories/ENSRegistry__factory'
import { DomainNotifier__factory } from '../typechain/factories/DomainNotifier__factory'
import { ensRegistryAddresses, VOLTA_CHAIN_ID } from '../src/resolverConfig'
import { getSubdomainsUsingResolver, getSubdomainsUsingRegistry } from '../src/getSubDomains';
import { DomainReader } from '../src';

const { JsonRpcProvider } = providers;

/**
 * This test suite is to retrieval of the suddomains actually
 * on Volta. Not intended to be run during CI/CD
 */
xdescribe('[getSubDomains]', async function () {
  this.timeout(0);
  const provider = new JsonRpcProvider('https://volta-rpc.energyweb.org');

  const publicResolverAddress = '0x0a97e07c4Df22e2e31872F20C5BE191D5EFc4680'
  const publicResolver = PublicResolver__factory.connect(publicResolverAddress, provider)

  const ensRegistryAddress = ensRegistryAddresses[VOLTA_CHAIN_ID]
  const ensRegistry = ENSRegistry__factory.connect(ensRegistryAddress, provider)

  const domainNotiferAddres = '0x3d7a48FDcd5EF3c3c3e7620D516bE0FC62eDe148'
  const domainNotifier = DomainNotifier__factory.connect(domainNotiferAddres, provider)
  const domainReader = new DomainReader(provider);

  const domain = "iam.ewc";
  let subDomains;
  let subDomains_usingRegistry;

  it("getSubdomains", async () => {
    subDomains = await getSubdomainsUsingResolver({
      domain: domain,
      publicResolver: publicResolver,
      ensRegistry: ensRegistry,
      domainNotifier: domainNotifier,
      domainReader,
      mode: "ALL"
    })
    console.log(subDomains.length)

    const subDomains2 = await getSubdomainsUsingResolver({
      domain: domain,
      publicResolver: publicResolver,
      ensRegistry: ensRegistry,
      domainNotifier: domainNotifier,
      domainReader,
      mode: "FIRSTLEVEL"
    })
    console.log(subDomains2.length)
  })

  it("getSubdomains using ENS Registry", async () => {
    subDomains_usingRegistry = await getSubdomainsUsingRegistry({
      domain: domain,
      domainReader: domainReader,
      ensRegistry: ensRegistry,
    })
    console.log(subDomains_usingRegistry.length)
  })
});
