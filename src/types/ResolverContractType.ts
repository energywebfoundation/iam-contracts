export enum ResolverContractType {
  PublicResolver = "public",
  RoleDefinitionResolver_v1 = "roledefv1"
}

export interface ResolverDefinition {
  type: ResolverContractType,
  isPrimary: boolean
}