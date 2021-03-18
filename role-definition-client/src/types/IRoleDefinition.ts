export interface IRoleDefinition extends IRoleDefinitionText {
  version: string;
  issuer: IIssuerDefinition
  enrolmentPreconditions: { type: PreconditionTypes; conditions: string[] }[];
}

export enum PreconditionTypes {
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