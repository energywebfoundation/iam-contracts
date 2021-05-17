import { providers } from 'ethers';
import { ENSRegistry__factory } from '../typechain/factories/ENSRegistry__factory'
import { ensRegistryAddresses, VOLTA_CHAIN_ID } from '../src/resolverConfig'
import { getSubdomainsUsingResolver, getSubdomainsUsingRegistry } from '../src/getSubDomains';

const { JsonRpcProvider } = providers;

/**
 * This test suite is to retrieval of the suddomains actually
 * on Volta. Not intended to be run during CI/CD
 */
xdescribe('[getSubDomains]', async function () {
  this.timeout(0);
  const provider = new JsonRpcProvider('https://volta-rpc.energyweb.org');

  const ensRegistryAddress = ensRegistryAddresses[VOLTA_CHAIN_ID]
  const ensRegistry = ENSRegistry__factory.connect(ensRegistryAddress, provider)

  const domain = "iam.ewc";
  let subDomains;
  let subDomains_usingRegistry;

  it("getSubdomains", async () => {
    subDomains = await getSubdomainsUsingResolver({
      domain: domain,
      ensRegistry: ensRegistry,
      provider,
      chainId: VOLTA_CHAIN_ID,
      mode: "ALL"
    })
    console.log(subDomains.length)

    const subDomains2 = await getSubdomainsUsingResolver({
      domain: domain,
      ensRegistry: ensRegistry,
      provider,
      chainId: VOLTA_CHAIN_ID,
      mode: "FIRSTLEVEL"
    })
    console.log(subDomains2.length)
  })

  it("getSubdomains using ENS Registry", async () => {
    subDomains_usingRegistry = await getSubdomainsUsingRegistry({
      domain: domain,
      provider,
      ensRegistry: ensRegistry,
    })
    console.log(subDomains_usingRegistry.length)
  })
});
