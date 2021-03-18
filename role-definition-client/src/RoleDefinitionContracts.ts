export interface IRoleDefinitionInterfaces {
  getImplementedInterfaces(): RoleDefinitionInterface[]
}

export enum RoleDefinitionInterface {
  // New interfaces defined 
  VersionNumber,
  IssuerTypeResolver,
  IssuersResolver,
  EnrolmentConditionTypeResolver,
  EnrolmentPrerequisiteRolesResolver,

  // Interfaces from PublicResolver
  Text
}

export class RoleDefinitionResolverInterfaces implements IRoleDefinitionInterfaces {
  readonly implementedInterfaces = [
    RoleDefinitionInterface.VersionNumber,
    RoleDefinitionInterface.IssuerTypeResolver,
    RoleDefinitionInterface.IssuersResolver,
    RoleDefinitionInterface.EnrolmentConditionTypeResolver,
    RoleDefinitionInterface.EnrolmentPrerequisiteRolesResolver,
    RoleDefinitionInterface.Text
  ]

  getImplementedInterfaces(): RoleDefinitionInterface[] {
    return this.implementedInterfaces;
  }
}