import { Provider } from "ethers/providers";
import { IIssuerDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType, IAppDefinition, IOrganizationDefinition } from './types/DomainDefinitions'
import { RoleDefinitionResolver__factory } from "../contract-types/factories/RoleDefinitionResolver__factory";
import { RoleDefinitionResolver } from "../contract-types/RoleDefinitionResolver"

export class DomainDefinitionReader {
  public static isOrgDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IOrganizationDefinition =>
    (domainDefinition as IOrganizationDefinition).orgName !== undefined;

  public static isAppDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IAppDefinition =>
    (domainDefinition as IAppDefinition).appName !== undefined;

  public static isRoleDefinition = (domainDefinition: IRoleDefinitionText | IOrganizationDefinition | IAppDefinition): domainDefinition is IRoleDefinition =>
    (domainDefinition as IRoleDefinition).roleName !== undefined;

  protected readonly _ensResolver: RoleDefinitionResolver;

  constructor(ensResolverAddress: string, provider: Provider) {
    this._ensResolver = RoleDefinitionResolver__factory.connect(ensResolverAddress, provider);
  }

  /**
   * 
   * @param node 
   * @returns 
   */
  public async read(node: string): Promise<IRoleDefinition | IAppDefinition | IOrganizationDefinition> {
    // TODO: Validate the node is a valid namehash

    const textData = await this._ensResolver.text(node, 'metadata');
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
      return await this.readRoleDefinition(node, textProps)
    }
    throw Error("unable to read domain definition")
  }

  // TODO: Muliticalify (make all the queries in one)
  private async readRoleDefinition(node: string, roleDefinitionText: IRoleDefinitionText) {
    const issuersData = await this._ensResolver.issuers(node);
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

    const prerequisiteRoleNodes = await this._ensResolver.prerequisiteRoles(node)
    const prerequisiteRoles = await Promise.all(prerequisiteRoleNodes.map(node => this._ensResolver.name(node)))
    const enrolmentPreconditions = prerequisiteRoles.length >= 1
      ? [{ type: PreconditionType.Role, conditions: prerequisiteRoles }]
      : []

    const version = await this._ensResolver.versionNumber(node);

    return {
      ...roleDefinitionText,
      issuer: issuers,
      version,
      enrolmentPreconditions
    };
  }
}