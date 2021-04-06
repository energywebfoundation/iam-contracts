import { Provider } from "ethers/providers";
import { IIssuerDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType, IAppDefinition, IOrganizationDefinition } from './types/DomainDefinitions'
import { RoleDefinitionResolver__factory } from "../contract-types/factories/RoleDefinitionResolver__factory";
import { RoleDefinitionResolver } from "../contract-types/RoleDefinitionResolver"
import { ENSRegistry__factory } from "../contract-types/factories/ENSRegistry__factory";
import { ensRegistryAddresses, knownEnsResolvers } from "./resolverConfig";
import { ResolverContractType } from "./types/ResolverContractType";
import { PublicResolver } from "../contract-types/PublicResolver";
import { PublicResolver__factory } from "../contract-types/factories/PublicResolver__factory";
import { ERROR_MESSAGES } from "./types/ErrorMessages";

export class DomainReader {
  public static isOrgDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IOrganizationDefinition =>
    (domainDefinition as IOrganizationDefinition).orgName !== undefined;

  public static isAppDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IAppDefinition =>
    (domainDefinition as IAppDefinition).appName !== undefined;

  public static isRoleDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IRoleDefinition =>
    (domainDefinition as IRoleDefinition).roleName !== undefined;

  constructor(private readonly provider: Provider) {
  }

  public async readName(node: string): Promise<string> {
    const { resolverAddress, resolverType } = await this.getResolverInfo(node);
    if (resolverType === ResolverContractType.PublicResolver) {
      const ensResolver = PublicResolver__factory.connect(resolverAddress, this.provider);
      return await ensResolver.name(node);
    }
    if (resolverType === ResolverContractType.RoleDefinitionResolver_v1) {
      const ensResolver = RoleDefinitionResolver__factory.connect(resolverAddress, this.provider);
      return await ensResolver.name(node);
    }
    throw Error(`${ERROR_MESSAGES.NAME_NOT_REGISTERED}, node: ${node}`)
  }

  /**
   * Reads the App, Org or Role Definition from the registered ENS resolver 
   * @param node the ENS node hash of a domain name
   * @returns
   */
  public async read(node: string): Promise<IRoleDefinition | IAppDefinition | IOrganizationDefinition> {
    const { resolverAddress, resolverType } = await this.getResolverInfo(node);

    if (resolverType === ResolverContractType.PublicResolver) {
      const ensResolver: PublicResolver = PublicResolver__factory.connect(resolverAddress, this.provider);
      const textData = await ensResolver.text(node, 'metadata');
      let definition
      try {
        definition = JSON.parse(textData, this.reviveDates) as IRoleDefinition | IAppDefinition | IOrganizationDefinition;
      } catch (err) {
        throw Error(`unable to parse resolved textData for node: ${node}. ${JSON.stringify(err)}`)
      }
      return definition
    }
    else if (resolverType === ResolverContractType.RoleDefinitionResolver_v1) {
      const ensResolver: RoleDefinitionResolver = RoleDefinitionResolver__factory.connect(resolverAddress, this.provider);
      const textData = await ensResolver.text(node, 'metadata');
      let textProps
      try {
        textProps = JSON.parse(textData, this.reviveDates) as IRoleDefinitionText | IAppDefinition | IOrganizationDefinition;
      } catch (err) {
        throw Error(`unable to parse resolved textData for node: ${node}. ${JSON.stringify(err)}`)
      }

      if (DomainReader.isOrgDefinition(textProps) || DomainReader.isAppDefinition(textProps)) {
        return textProps
      }
      if (DomainReader.isRoleDefinition(textProps)) {
        return await this.readRoleDefResolver_v1(node, textProps, ensResolver)
      }
      throw Error(ERROR_MESSAGES.DOMAIN_TYPE_UNKNWN)
    }
    throw Error(ERROR_MESSAGES.RESOLVER_NOT_SUPPORTED)
  }

  protected async getResolverInfo(node: string): Promise<{ resolverAddress: string, resolverType: ResolverContractType }> {
    const network = await this.provider.getNetwork();
    const chainId = network.chainId
    const ensRegistryAddress = ensRegistryAddresses[chainId]
    const ensRegistry = ENSRegistry__factory.connect(ensRegistryAddress, this.provider);

    // Get resolver from registry
    const resolverAddress = await ensRegistry.resolver(node);
    if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      throw Error(ERROR_MESSAGES.DOMAIN_NOT_REGISTERED)
    }

    const resolverType = knownEnsResolvers[chainId][resolverAddress]
    if (resolverType === undefined) {
      throw Error(ERROR_MESSAGES.RESOLVER_NOT_KNOWN)
    }

    return { resolverAddress, resolverType }
  }

  // TODO: Muliticalify (make all the queries in one)
  protected async readRoleDefResolver_v1(node: string, roleDefinitionText: IRoleDefinitionText, ensResolver: RoleDefinitionResolver) {
    const issuersData = await ensResolver.issuers(node);
    let issuerType: string;
    if (issuersData.dids.length > 0) {
      issuerType = 'DID'
    }
    else if (issuersData.role != "") {
      issuerType = 'Role'
    }
    else {
      issuerType = ''
    }
    const issuers: IIssuerDefinition = {
      issuerType,
      did: issuersData.dids.map(address => `did:ethr:${address}`),
      roleName: issuersData.role
    }

    const prerequisiteRoleNodes = await ensResolver.prerequisiteRoles(node)
    const prerequisiteRoles = await Promise.all(prerequisiteRoleNodes.map(node => ensResolver.name(node)))
    const enrolmentPreconditions = prerequisiteRoles.length >= 1
      ? [{ type: PreconditionType.Role, conditions: prerequisiteRoles }]
      : []

    const version = await ensResolver.versionNumber(node);

    return {
      ...roleDefinitionText,
      issuer: issuers,
      version,
      enrolmentPreconditions
    };
  }

  protected reviveDates(key, value) {
    if (key === "minDate" || key === "maxDate") {
      return new Date(value);
    }
    return value;
  }
}