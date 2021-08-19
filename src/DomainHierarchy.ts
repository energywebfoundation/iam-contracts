import { EventFilter, utils, providers } from "ethers";
import { ENSRegistry } from "../ethers/ENSRegistry";
import { abi as ensRegistryContract } from "../build/contracts/ENS.json";
import { abi as ensResolverContract } from "../build/contracts/PublicResolver.json";
import { abi as domainNotifierContract } from '../build/contracts/DomainNotifier.json';
import { emptyAddress } from "./constants";
import { DomainReader } from "./DomainReader";
import { PublicResolver__factory } from "../ethers/factories/PublicResolver__factory";
import { DomainNotifier__factory } from "../ethers/factories/DomainNotifier__factory";
import { PublicResolver } from "../ethers/PublicResolver";
import { DomainNotifier } from "../ethers/DomainNotifier";
import { Result } from "@ethersproject/abi";

export class DomainHierarchy {
  protected readonly _domainReader: DomainReader;
  protected readonly _ensRegistry: ENSRegistry;
  protected readonly _provider: providers.Provider;
  protected readonly _domainNotifier: DomainNotifier;
  protected readonly _publicResolver?: PublicResolver;

  constructor({
    domainReader,
    ensRegistry,
    provider,
    domainNotifierAddress,
    publicResolverAddress,
  }: {
    domainReader: DomainReader,
    ensRegistry: ENSRegistry,
    provider: providers.Provider,
    domainNotifierAddress: string
    publicResolverAddress?: string,
  }) {
    if (!domainReader) throw new Error("You need to pass a DomainReader");
    this._domainReader = domainReader;
    if (!ensRegistry) throw new Error("You need to pass an ensRegistry ethers contract");
    this._ensRegistry = ensRegistry;
    if (!provider) throw new Error("You need to pass a provider");
    this._provider = provider;
    if (!domainNotifierAddress) throw new Error("You need to pass the address of a domain notifier contract");
    this._domainNotifier = DomainNotifier__factory.connect(domainNotifierAddress, provider)

    if (publicResolverAddress) {
      this._publicResolver = PublicResolver__factory.connect(publicResolverAddress, provider);
    }
  }

  /**
   * Retrieves list of subdomains from on-chain for a given parent domain
   * based on the logs from the ENS resolver contracts.
   * By default, queries from the DomainNotifier contract.
   * If publicResolver available, also queries from PublicResolver contract.
   */
  public getSubdomainsUsingResolver = async ({
    domain,
    mode
  }: {
    domain: string;
    mode: "ALL" | "FIRSTLEVEL";
  }): Promise<string[]> => {
    if (!domain) throw new Error("You need to pass a domain name");

    if (mode === "ALL") {
      const getParser = (nameReader: (node: string) => Promise<string>) => {
        return async ({ node }: Result) => {
          try {
            const name = await nameReader(node);
            if (name.endsWith(domain) && name !== domain) {
              const owner = await this._ensRegistry.owner(node);
              if (owner === emptyAddress) return "";
              return name;
            }
          } catch {
            // A possible source of exceptions is if domain has been deleted (https://energyweb.atlassian.net/browse/SWTCH-997)
            return "";
          }
          return "";
        }
      }
      let subDomains = await this.getDomainsFromLogs({
        parser: getParser(this._domainReader.readName.bind(this._domainReader)),
        provider: this._domainNotifier.provider,
        event: this._domainNotifier.filters.DomainUpdated(null),
        contractInterface: new utils.Interface(domainNotifierContract)
      });
      if (this._publicResolver) {
        const publicResolverDomains = await this.getDomainsFromLogs({
          parser: getParser(this._publicResolver.name),
          provider: this._publicResolver.provider,
          event: this._publicResolver.filters.TextChanged(null, "metadata", null),
          contractInterface: new utils.Interface(ensResolverContract)
        });
        subDomains = new Set([...publicResolverDomains, ...subDomains]);
      }
      return [...subDomains].filter(Boolean); // Boolean filter to remove empty string
    }
    const singleLevel = await this.getDomainsFromLogs({
      contractInterface: new utils.Interface(ensRegistryContract),
      event: this._ensRegistry.filters.NewOwner(utils.namehash(domain), null, null),
      parser: async ({ node, label, owner }) => {
        if (owner === emptyAddress) return "";
        const namehash = utils.keccak256(node + label.slice(2));
        try {
          const [name, ownerAddress] = await Promise.all([
            this._domainReader.readName(namehash),
            this._ensRegistry.owner(namehash)
          ]);
          if (ownerAddress === emptyAddress) return "";
          return name;
        }
        catch {
          return "";
        }
      },
      provider: this._ensRegistry.provider
    });
    return [...singleLevel].filter(Boolean); // Boolean filter to remove empty string
  };

  /**
   * Retrieves list of subdomains from on-chain for a given parent domain
   * based on the ENS Registry contract logs.
   * For multi-level queries with many domains, querying the registry is slower than
   * using the resolver contract because of the repeated RPC call.
   */
  public getSubdomainsUsingRegistry = async ({
    domain,
  }: {
    domain: string;
  }): Promise<string[]> => {
    if (!domain) throw new Error("You need to pass a domain name");
    const notRelevantDomainEndings = ["roles", "apps"]
    const parser = async ({ node, label, owner }: Result) => {
      try {
        if (owner === emptyAddress) return "";
        const namehash = utils.keccak256(node + label.slice(2));
        const [name, ownerAddress] = await Promise.all([
          this._domainReader.readName(namehash),
          this._ensRegistry.owner(namehash)
        ]);
        if (ownerAddress === emptyAddress) return "";
        return name;
      } catch {
        // A possible source of exceptions is if domain has been deleted (https://energyweb.atlassian.net/browse/SWTCH-997)
        return "";
      }
    }
    const queue: string[][] = []
    const subDomains: Set<string> = new Set();
    queue.push([domain])
    subDomains.add(domain)

    // Breadth-first search down subdomain tree
    while (queue.length > 0) {
      const currentNodes = queue[0]
      const currentNameHashes = currentNodes.map(node => utils.namehash(node));
      const event = this._ensRegistry.filters.NewOwner(null, null, null)
      // topics should be able to accept an array: https://docs.ethers.io/v5/concepts/events/
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      event.topics[1] = currentNameHashes
      const uniqueDomains = await this.getDomainsFromLogs({
        provider: this._ensRegistry.provider,
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

  private getDomainsFromLogs = async ({
    provider,
    parser,
    event,
    contractInterface
  }: {
    provider: providers.Provider;
    parser: (log: Result) => Promise<string>;
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
    logs.filter(log => log.address !== emptyAddress);
    const rawLogs = logs.map(log => {
      const parsedLog = contractInterface.parseLog(log);
      /** ethers_v5 Interface.parseLog incorrectly parses log, so have to use lowlevel alternative */
      return contractInterface.decodeEventLog(parsedLog.name, log.data, log.topics);
    });
    const domains = await Promise.all(rawLogs.map(parser));
    const nonEmptyDomains = domains.filter(domain => domain != '');
    return new Set(nonEmptyDomains);
  };
}
