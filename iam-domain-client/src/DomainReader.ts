import { Provider } from "ethers/providers";
import { IIssuerDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType, IAppDefinition, IOrganizationDefinition } from './types/DomainDefinitions'
import { RoleDefinitionResolver__factory } from "../contract-types/factories/RoleDefinitionResolver__factory";
import { RoleDefinitionResolver } from "../contract-types/RoleDefinitionResolver"
import { ENSRegistry } from "../contract-types/ENSRegistry"
import { ENSRegistry__factory } from "../contract-types/factories/ENSRegistry__factory";
import { ensRegistryAddresses, knownEnsResolvers } from "./resolverConfig";
import { ResolverContractType } from "./types/ResolverContractType";
import { PublicResolver } from "../contract-types/PublicResolver";
import { PublicResolver__factory } from "../contract-types/factories/PublicResolver__factory";
import { ERROR_MESSAGES } from "./types/ErrorMessages";

export class DomainDefinitionReader {
  public static isOrgDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IOrganizationDefinition =>
    (domainDefinition as IOrganizationDefinition).orgName !== undefined;

  public static isAppDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IAppDefinition =>
    (domainDefinition as IAppDefinition).appName !== undefined;

  public static isRoleDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IRoleDefinition =>
    (domainDefinition as IRoleDefinition).roleName !== undefined;

  protected readonly _ensRegistry: ENSRegistry;

  constructor(private readonly chainID: number, private readonly provider: Provider) {
    const ensRegistryAddress = ensRegistryAddresses[chainID]
    this._ensRegistry = ENSRegistry__factory.connect(ensRegistryAddress, provider);
  }

  /**
   * 
   * @param node 
   * @returns
   */
  public async read(node: string): Promise<IRoleDefinition | IAppDefinition | IOrganizationDefinition> {
    // TODO: Validate the node is a valid namehash

    // Get resolver from registry
    const resolverAddress = await this._ensRegistry.resolver(node);
    if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      throw Error(ERROR_MESSAGES.DOMAIN_NOT_REGISTERED)
    }

    const resolverType = knownEnsResolvers[this.chainID][resolverAddress]
    if (resolverType === undefined) {
      throw Error(ERROR_MESSAGES.RESOLVER_NOT_KNOWN)
    }

    if (resolverType === ResolverContractType.PublicResolver) {
      const ensResolver: PublicResolver = PublicResolver__factory.connect(resolverAddress, this.provider);
      const textData = await ensResolver.text(node, 'metadata');
      let definition
      try {
        definition = JSON.parse(textData) as IRoleDefinitionText | IAppDefinition | IOrganizationDefinition;
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
        textProps = JSON.parse(textData) as IRoleDefinitionText | IAppDefinition | IOrganizationDefinition;
      } catch (err) {
        throw Error(`unable to parse resolved textData for node: ${node}. ${JSON.stringify(err)}`)
      }

      if (DomainDefinitionReader.isOrgDefinition(textProps) || DomainDefinitionReader.isAppDefinition(textProps)) {
        return textProps
      }
      if (DomainDefinitionReader.isRoleDefinition(textProps)) {
        return await this.readRoleDefinition(node, textProps, ensResolver)
      }
      throw Error("unable to read domain definition")
    }
    throw Error("resolver type not supported")
  }

  // TODO: Muliticalify (make all the queries in one)
  private async readRoleDefinition(node: string, roleDefinitionText: IRoleDefinitionText, ensResolver: RoleDefinitionResolver) {
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
}