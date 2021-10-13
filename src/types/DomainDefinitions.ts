export interface IAppDefinition {
  appName: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  others?: Record<string, unknown>;
}

export interface IOrganizationDefinition {
  orgName: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  others?: Record<string, unknown>;
}

export interface IRoleDefinition extends IRoleDefinitionText {
  version: number;
  issuer: IIssuerDefinition
  enrolmentPreconditions: { type: PreconditionType; conditions: string[] }[];
}

export interface IRoleDefinitionV2 extends IRoleDefinitionText {
  version: number;
  issuer: IIssuerDefinition
  revoker: IRevokerDefinition
  enrolmentPreconditions: { type: PreconditionType; conditions: string[] }[];
}

export enum PreconditionType {
  Role = "role"
}

export interface IRoleDefinitionText {
  roleType: string;
  roleName: string;
  fields: {
    fieldType: string;
    label: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minValue?: number;
    maxValue?: number;
    minDate?: Date;
    maxDate?: Date;
  }[];
  metadata: Record<string, unknown> | Record<string, unknown>[];
}

export interface IIssuerDefinition {
  issuerType?: string;
  did?: string[];
  roleName?: string;
}

export interface IRevokerDefinition {
  revokerType?: string;
  did?: string[];
  roleName?: string;
}