import { IAppDefinition, IIssuerDefinition, IOrganizationDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType } from './types/DomainDefinitions'
import { VOLTA_CHAIN_ID, VOLTA_PUBLIC_RESOLVER_ADDRESS, VOLTA_RESOLVER_V1_ADDRESS } from "./chainConstants";
import { ENSRegistry__factory } from "../ethers-v4/factories/ENSRegistry__factory";
import { Provider } from "ethers/providers";
import { PublicResolver } from "../ethers-v4/PublicResolver";
import { PublicResolver__factory } from "../ethers-v4/factories/PublicResolver__factory";
import { RoleDefinitionResolver } from "../ethers-v4/RoleDefinitionResolver"
import { namehash } from "ethers/utils";
import { RoleDefinitionResolver__factory } from "../ethers-v4/factories/RoleDefinitionResolver__factory";
import { ResolverContractType } from "./types/ResolverContractType";
import { ERROR_MESSAGES } from "./types/ErrorMessages";
import { ENSRegistry } from '../ethers-v4/ENSRegistry';

export class DomainReader {
  public static isOrgDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IOrganizationDefinition =>
    (domainDefinition as IOrganizationDefinition).orgName !== undefined;

  public static isAppDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IAppDefinition =>
    (domainDefinition as IAppDefinition).appName !== undefined;

  public static isRoleDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IRoleDefinition =>
    (domainDefinition as IRoleDefinition).roleName !== undefined;

  private readonly _provider: Provider
  private readonly _ensRegistry: ENSRegistry;
  private readonly _knownEnsResolvers: Record<number, Record<string, ResolverContractType>> = {
    [VOLTA_CHAIN_ID]: {
      [VOLTA_PUBLIC_RESOLVER_ADDRESS]: ResolverContractType.PublicResolver,
      [VOLTA_RESOLVER_V1_ADDRESS]: ResolverContractType.RoleDefinitionResolver_v1
    }
  };

  constructor({ ensRegistryAddress, provider }: { ensRegistryAddress: string, provider: Provider }) {
    this._provider = provider;
    this._ensRegistry = ENSRegistry__factory.connect(ensRegistryAddress, this._provider);
  }

  public addKnownResolver({ chainId, address, type }: { chainId: number, address: string, type: ResolverContractType }): void {
    if (!this._knownEnsResolvers[chainId]) {
      this._knownEnsResolvers[chainId] = {}
    }
    this._knownEnsResolvers[chainId][address] = type;
  }

  /**
   * Reads the reverse name for a node from its registered ENS resolver contract 
   * @param node the ENS node hash of a domain name 
   * @returns The name associated with the node.
   */
  public async readName(node: string): Promise<string> {
    const checkName = (name: string) => {
      if (node !== namehash(name)) {
        throw Error(`${ERROR_MESSAGES.NAME_NODE_MISMATCH}, node: ${node}`)
      }
      return name;
    }

    const { resolverAddress, resolverType } = await this.getResolverInfo(node);
    if (resolverType === ResolverContractType.PublicResolver) {
      const ensResolver = PublicResolver__factory.connect(resolverAddress, this._provider);
      const name = await ensResolver.name(node);
      return checkName(name)
    }
    if (resolverType === ResolverContractType.RoleDefinitionResolver_v1) {
      const ensResolver = RoleDefinitionResolver__factory.connect(resolverAddress, this._provider);
      const name = await ensResolver.name(node);
      return checkName(name)
    }
    throw Error(`${ERROR_MESSAGES.RESOLVER_NOT_SUPPORTED}, node: ${node}`)
  }

  /**
   * Reads the App, Org or Role Definition from the registered ENS resolver contract
   * @param node the ENS node hash of a domain name
   * @returns
   */
  public async read({ node }: { node: string }): Promise<IRoleDefinition | IAppDefinition | IOrganizationDefinition> {
    const { resolverAddress, resolverType } = await this.getResolverInfo(node);

    if (resolverType === ResolverContractType.PublicResolver) {
      const ensResolver: PublicResolver = PublicResolver__factory.connect(resolverAddress, this._provider);
      const textData = await ensResolver.text(node, 'metadata');
      let definition
      try {
        definition = JSON.parse(textData, this.reviveDates) as IRoleDefinition | IAppDefinition | IOrganizationDefinition;
      } catch (err) {
        throw Error(`unable to parse resolved textData for node: ${node}. textData: ${textData}. error: ${JSON.stringify(err)}`)
      }
      return definition
    }
    else if (resolverType === ResolverContractType.RoleDefinitionResolver_v1) {
      const ensResolver: RoleDefinitionResolver = RoleDefinitionResolver__factory.connect(resolverAddress, this._provider);
      const textData = await ensResolver.text(node, 'metadata');
      let textProps
      try {
        textProps = JSON.parse(textData, this.reviveDates) as IRoleDefinitionText | IAppDefinition | IOrganizationDefinition;
      } catch (err) {
        throw Error(`unable to parse resolved textData for node: ${node}. textData: ${textData}. error: ${JSON.stringify(err)}`)
      }

      if (DomainReader.isOrgDefinition(textProps) || DomainReader.isAppDefinition(textProps)) {
        return textProps
      }
      if (DomainReader.isRoleDefinition(textProps)) {
        return await this.readRoleDefResolver_v1(node, textProps, ensResolver)
      }
      throw Error(ERROR_MESSAGES.DOMAIN_TYPE_UNKNOWN)
    }
    throw Error(ERROR_MESSAGES.RESOLVER_NOT_SUPPORTED)
  }

  protected async getResolverInfo(node: string): Promise<{ resolverAddress: string, resolverType: ResolverContractType }> {
    const network = await this._provider.getNetwork();
    const chainId = network.chainId
    // Get resolver from registry
    const resolverAddress = await this._ensRegistry.resolver(node);
    if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      throw Error(ERROR_MESSAGES.DOMAIN_NOT_REGISTERED)
    }

    const resolversForChain = this._knownEnsResolvers[chainId]
    if (resolversForChain === undefined) {
      throw Error(ERROR_MESSAGES.RESOLVER_NOT_KNOWN)
    }
    const resolverType = resolversForChain[resolverAddress]
    if (resolverType === undefined) {
      throw Error(ERROR_MESSAGES.RESOLVER_NOT_KNOWN)
    }

    return { resolverAddress, resolverType }
  }

  // TODO: Muliticalify (make all the queries in one)
  protected async readRoleDefResolver_v1(node: string, roleDefinitionText: IRoleDefinitionText, ensResolver: RoleDefinitionResolver): Promise<IRoleDefinition> {
    const issuersData = await ensResolver.issuers(node);
    let issuer: IIssuerDefinition;
    if (issuersData.dids.length > 0) {
      issuer = {
        issuerType: 'DID',
        did: issuersData.dids.map(address => `did:ethr:${address}`),
      }
    }
    else if (issuersData.role != "") {
      issuer = {
        issuerType: 'Role',
        roleName: issuersData.role
      }
    }
    else {
      issuer = {}
    }

    const prerequisiteRolesNodes = await ensResolver.prerequisiteRoles(node)
    const prerequisiteRoles = await Promise.all(prerequisiteRolesNodes[0].map(node => ensResolver.name(node)))
    const enrolmentPreconditions = prerequisiteRoles.length >= 1
      ? [{ type: PreconditionType.Role, conditions: prerequisiteRoles }]
      : []

    const version = (await ensResolver.versionNumber(node)).toNumber();

    return {
      ...roleDefinitionText,
      issuer,
      version,
      enrolmentPreconditions
    };
  }

  protected reviveDates(key: string, value: string | number | Date): string | number | Date {
    if (key === "minDate" || key === "maxDate") {
      return new Date(value);
    }
    return value;
  }
}