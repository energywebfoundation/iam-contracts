import { EventFilter, utils, providers } from "ethers";
import { ENSRegistry } from "../typechain/ENSRegistry";
import { abi as ensRegistryContract } from "../build/contracts/ENS.json";
import { abi as ensResolverContract } from "../build/contracts/PublicResolver.json";
import { abi as domainNotifierContract } from '../build/contracts/DomainNotifier.json';
import { emptyAddress } from "./constants";
import { DomainReader } from "./DomainReader";
import { DomainNotifier } from "../typechain/DomainNotifier";
import { getDomainNotifer } from "./resolverConfig";
import { ResolverContractType } from "./types/ResolverContractType";
import { PublicResolver__factory } from "../typechain/factories/PublicResolver__factory";
import { DomainNotifier__factory } from "../typechain/factories/DomainNotifier__factory";
import { Provider } from "ethers/providers";
import { PublicResolver } from "../typechain/PublicResolver";
import { ERROR_MESSAGES } from "./types/ErrorMessages";

/**
 * Retrieves list of subdomains from on-chain for a given parent domain
 * based on the logs from the ENS resolver contracts.
 * By default, queries from the DomainNotifier contract.
 * If publicResolver available, also queries from PublicResolver contract.
 */
export const getSubdomainsUsingResolver = async ({
  domain,
  ensRegistry,
  provider,
  chainId,
  publicResolverAddress,
  mode
}: {
  domain: string;
  ensRegistry: ENSRegistry;
  provider: Provider,
  chainId: number,
  publicResolverAddress?: string,
  mode: "ALL" | "FIRSTLEVEL";
}): Promise<string[]> => {
  if (!domain) throw new Error("You need to pass a domain name");
  if (!ensRegistry) throw new Error("You need to pass an ensRegistry ethers contract");

  let publicResolver: PublicResolver | undefined
  if (publicResolverAddress) {
    publicResolver = PublicResolver__factory.connect(publicResolverAddress, provider);
  }

  const domainNotifierAddress = getDomainNotifer(chainId)
  let domainNotifier: DomainNotifier
  if (domainNotifierAddress) {
    domainNotifier = DomainNotifier__factory.connect(domainNotifierAddress, provider)
  }
  else {
    throw new Error(`${ERROR_MESSAGES.DOMAIN_NOTIFIER_NOT_SET}, type: ${ResolverContractType.RoleDefinitionResolver_v1}, chainId: ${chainId}`);
  }

  const domainReader = new DomainReader(provider);

  if (mode === "ALL") {
    const getParser = (nameReader: (node: string) => Promise<string>) => {
      return async ({ node }: { node: string, }) => {
        const name = await nameReader(node);
        if (name.endsWith(domain) && name !== domain) {
          const owner = await ensRegistry.owner(node);
          if (owner === emptyAddress) return "";
          return name;
        }
        return "";
      }
    }
    let subDomains = await getDomainsFromLogs({
      parser: getParser(domainReader.readName.bind(domainReader)),
      provider: domainNotifier.provider,
      event: domainNotifier.filters.DomainUpdated(null),
      contractInterface: new utils.Interface(domainNotifierContract)
    });
    if (publicResolver) {
      const publicResolverDomains = await getDomainsFromLogs({
        parser: getParser(publicResolver.name),
        provider: publicResolver.provider,
        event: publicResolver.filters.TextChanged(null, "metadata", null),
        contractInterface: new utils.Interface(ensResolverContract)
      });
      subDomains = new Set([...publicResolverDomains, ...subDomains]);
    }
    return [...subDomains].filter(Boolean); // Boolean filter to remove empty string
  }
  const singleLevel = await getDomainsFromLogs({
    contractInterface: new utils.Interface(ensRegistryContract),
    event: ensRegistry.filters.NewOwner(utils.namehash(domain), null, null),
    parser: async ({ node, label, owner }) => {
      if (owner === emptyAddress) return "";
      const namehash = utils.keccak256(node + label.slice(2));
      try {
        const [name, ownerAddress] = await Promise.all([
          domainReader.readName(namehash),
          ensRegistry.owner(namehash)
        ]);
        if (ownerAddress === emptyAddress) return "";
        return name;
      }
      catch {
        return "";
      }
    },
    provider: ensRegistry.provider
  });
  return [...singleLevel]
};

/**
 * Retrieves list of subdomains from on-chain for a given parent domain
 * based on the ENS Registry contract logs.
 * For multi-level queries with many domains, querying the registry is slower than
 * using the resolver contract because of the repeated RPC call.
 */
export const getSubdomainsUsingRegistry = async ({
  domain,
  provider,
  ensRegistry,
}: {
  domain: string;
  provider: Provider;
  ensRegistry: ENSRegistry;
}): Promise<string[]> => {
  if (!domain) throw new Error("You need to pass a domain name");
  if (!ensRegistry) throw new Error("You need to pass an ensRegistry ethers contract");
  if (!provider) throw new Error("You need to pass a provider");
  const domainReader = new DomainReader(provider);

  const notRelevantDomainEndings = ["roles", "apps"]

  const parser = async ({ node, label, owner }: { node: string, label: string, owner: string }) => {
    if (owner === emptyAddress) return "";
    const namehash = utils.keccak256(node + label.slice(2));
    const [name, ownerAddress] = await Promise.all([
      domainReader.readName(namehash),
      ensRegistry.owner(namehash)
    ]);
    if (ownerAddress === emptyAddress) return "";
    return name;
  }
  const queue: string[][] = []
  const subDomains: Set<string> = new Set();
  queue.push([domain])
  subDomains.add(domain)

  // Breadth-first search down subdomain tree
  while (queue.length > 0) {
    const currentNodes = queue[0]
    const currentNameHashes = currentNodes.map(node => utils.namehash(node));
    const event = ensRegistry.filters.NewOwner(null, null, null)
    // topics should be able to accept an array: https://docs.ethers.io/v5/concepts/events/
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    event.topics[1] = currentNameHashes
    const uniqueDomains = await getDomainsFromLogs({
      provider: ensRegistry.provider,
      parser,
      event,
      contractInterface: new utils.Interface(ensRegistryContract)
    })
    if (uniqueDomains.size > 0) {
      queue.push([...uniqueDomains])
    }
    for (const domain of uniqueDomains) {
      const leafLabel = domain.split(".")[0]
      if (notRelevantDomainEndings.includes(leafLabel)) continue
      subDomains.add(domain)
    }
    queue.shift()
  }
  return [...subDomains].filter(Boolean); // Boolean filter to remove empty string
};

const getDomainsFromLogs = async ({
  provider,
  parser,
  event,
  contractInterface
}: {
  provider: providers.Provider;
  parser: (log: { node: string; label: string; owner: string }) => Promise<string>;
  event: EventFilter;
  contractInterface: utils.Interface;
}) => {
  const filter = {
    fromBlock: 0,
    toBlock: "latest",
    address: event.address,
    topics: event.topics || []
  };
  const logs = await provider.getLogs(filter);
  const rawLogs = logs.map(log => {
    const parsedLog = contractInterface.parseLog(log);
    return parsedLog.values;
  });
  const domains = await Promise.all(rawLogs.map(parser));
  return new Set(domains);
};
