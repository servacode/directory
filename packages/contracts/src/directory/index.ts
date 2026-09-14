import {
  asRecord,
  defineSchema,
  issue,
  readBoolean,
  readIdentifier,
  readNumber,
  readOptionalString,
  readString,
  rejectUnknownKeys,
} from '../common/runtime-schema.js';
import type { Identifier } from '../common/types.js';

export const FACILITY_SPECIALIZATIONS = ['GENERIC', 'PHARMACY', 'MEDICAL_CLINIC', 'NURSING_CENTER'] as const;
export type FacilitySpecialization = (typeof FACILITY_SPECIALIZATIONS)[number];

export interface DirectoryCategoryCapabilitiesDTO {
  readonly businessHours: boolean;
  readonly photos: boolean;
  readonly ratings: boolean;
  readonly duty?: boolean;
  readonly specialtyFilter?: boolean;
  readonly serviceFilter?: boolean;
}

export interface DirectoryCategoryGroupDTO {
  readonly id: Identifier;
  readonly code: string;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface DirectoryCategoryDTO {
  readonly id: Identifier;
  readonly groupId: Identifier;
  readonly groupCode?: string;
  readonly groupNameAr?: string;
  readonly groupNameEn?: string;
  readonly code?: string;
  readonly slug?: string;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly iconKey: string;
  readonly specialization: FacilitySpecialization;
  readonly capabilities: DirectoryCategoryCapabilitiesDTO;
  readonly isActive: boolean;
  readonly publicEnabled: boolean;
  readonly ownerRegistrationEnabled: boolean;
  readonly sortOrder: number;
}

export interface CategoryVerificationRequirementDTO {
  readonly id: Identifier;
  readonly categoryId: Identifier;
  readonly code: string;
  readonly labelAr: string;
  readonly labelEn?: string;
  readonly instructionsAr?: string;
  readonly instructionsEn?: string;
  readonly evidenceKind: 'IMAGE';
  readonly isRequired: boolean;
  readonly isActive: boolean;
  readonly minFiles: number;
  readonly maxFiles: number;
  readonly sortOrder: number;
}

export interface FacilityVerificationEvidenceDTO {
  readonly id: Identifier;
  readonly facilityId: Identifier;
  readonly requirementId: Identifier;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

export interface CreateDirectoryCategoryRequest {
  readonly groupId: Identifier;
  readonly code?: string;
  readonly slug?: string;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly iconKey: string;
  readonly sortOrder: number;
}

export interface UpdateDirectoryCategoryRequest {
  readonly groupId: Identifier;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly iconKey: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface CreateDirectoryCategoryGroupRequest {
  readonly code?: string;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly sortOrder: number;
}

export interface UpdateDirectoryCategoryGroupRequest {
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface CategoryProvinceActivationRequest {
  readonly publicEnabled: boolean;
  readonly ownerRegistrationEnabled: boolean;
}

export interface UpsertVerificationRequirementRequest {
  readonly code?: string;
  readonly labelAr: string;
  readonly labelEn?: string;
  readonly instructionsAr?: string;
  readonly instructionsEn?: string;
  readonly isRequired: boolean;
  readonly isActive: boolean;
  readonly minFiles: number;
  readonly maxFiles: number;
  readonly sortOrder: number;
}

const CODE_RE = /^[A-Z0-9_]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;

function readCode(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key, { min: 2, max: 80 });
  if (!CODE_RE.test(value)) issue(`$.${key}`, 'Expected uppercase code using A-Z, 0-9 and underscore');
  return value;
}
function readSlug(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key, { min: 2, max: 100 });
  if (!SLUG_RE.test(value)) issue(`$.${key}`, 'Expected lowercase URL slug');
  return value;
}
function optionalText(record: Record<string, unknown>, key: string, max: number) {
  const value = readOptionalString(record, key, { max });
  return value === '' ? undefined : value;
}

export const createDirectoryCategoryRequestSchema = defineSchema<CreateDirectoryCategoryRequest>((input) => {
  const r = asRecord(input);
  rejectUnknownKeys(r, ['groupId','code','slug','nameAr','nameEn','iconKey','sortOrder']);
  const nameEn = optionalText(r,'nameEn',120);
  const codeRaw=readOptionalString(r,'code',{min:2,max:80}),slugRaw=readOptionalString(r,'slug',{min:2,max:100});
  if(codeRaw&&!CODE_RE.test(codeRaw))issue('$.code','Expected uppercase code using A-Z, 0-9 and underscore');
  if(slugRaw&&!SLUG_RE.test(slugRaw))issue('$.slug','Expected lowercase URL slug');
  return {
    groupId: readIdentifier(r,'groupId'), ...(codeRaw?{code:codeRaw}:{}), ...(slugRaw?{slug:slugRaw}:{}),
    nameAr: readString(r,'nameAr',{min:2,max:120}), ...(nameEn?{nameEn}:{}),
    iconKey: readString(r,'iconKey',{min:2,max:80}), sortOrder: readNumber(r,'sortOrder',{integer:true,min:0,max:100000}),
  };
});

export const updateDirectoryCategoryRequestSchema = defineSchema<UpdateDirectoryCategoryRequest>((input) => {
  const r=asRecord(input);
  rejectUnknownKeys(r,['groupId','nameAr','nameEn','iconKey','isActive','sortOrder']);
  const nameEn=optionalText(r,'nameEn',120);
  return {groupId:readIdentifier(r,'groupId'),nameAr:readString(r,'nameAr',{min:2,max:120}),...(nameEn?{nameEn}:{}),iconKey:readString(r,'iconKey',{min:2,max:80}),
    isActive:readBoolean(r,'isActive'),sortOrder:readNumber(r,'sortOrder',{integer:true,min:0,max:100000})};
});

export const createDirectoryCategoryGroupRequestSchema = defineSchema<CreateDirectoryCategoryGroupRequest>((input)=>{
  const r=asRecord(input);rejectUnknownKeys(r,['code','nameAr','nameEn','sortOrder']);
  const nameEn=optionalText(r,'nameEn',120);
  const codeRaw=readOptionalString(r,'code',{min:2,max:80});if(codeRaw&&!CODE_RE.test(codeRaw))issue('$.code','Expected uppercase code using A-Z, 0-9 and underscore');
  return {...(codeRaw?{code:codeRaw}:{}),nameAr:readString(r,'nameAr',{min:2,max:120}),...(nameEn?{nameEn}:{}),sortOrder:readNumber(r,'sortOrder',{integer:true,min:0,max:100000})};
});

export const updateDirectoryCategoryGroupRequestSchema = defineSchema<UpdateDirectoryCategoryGroupRequest>((input)=>{
  const r=asRecord(input);rejectUnknownKeys(r,['nameAr','nameEn','isActive','sortOrder']);
  const nameEn=optionalText(r,'nameEn',120);
  return {nameAr:readString(r,'nameAr',{min:2,max:120}),...(nameEn?{nameEn}:{}),isActive:readBoolean(r,'isActive'),sortOrder:readNumber(r,'sortOrder',{integer:true,min:0,max:100000})};
});


export const categoryProvinceActivationRequestSchema = defineSchema<CategoryProvinceActivationRequest>((input)=>{
  const r=asRecord(input);rejectUnknownKeys(r,['publicEnabled','ownerRegistrationEnabled']);
  return {publicEnabled:readBoolean(r,'publicEnabled'),ownerRegistrationEnabled:readBoolean(r,'ownerRegistrationEnabled')};
});

export const upsertVerificationRequirementRequestSchema = defineSchema<UpsertVerificationRequirementRequest>((input)=>{
  const r=asRecord(input);rejectUnknownKeys(r,['code','labelAr','labelEn','instructionsAr','instructionsEn','isRequired','isActive','minFiles','maxFiles','sortOrder']);
  const labelEn=optionalText(r,'labelEn',160),instructionsAr=optionalText(r,'instructionsAr',500),instructionsEn=optionalText(r,'instructionsEn',500);
  const minFiles=readNumber(r,'minFiles',{integer:true,min:0,max:10}),maxFiles=readNumber(r,'maxFiles',{integer:true,min:0,max:10});
  if(maxFiles<minFiles)issue('$.maxFiles','maxFiles must be >= minFiles');
  const codeRaw=readOptionalString(r,'code',{min:2,max:80});if(codeRaw&&!CODE_RE.test(codeRaw))issue('$.code','Expected uppercase code using A-Z, 0-9 and underscore');
  return {...(codeRaw?{code:codeRaw}:{}),labelAr:readString(r,'labelAr',{min:2,max:160}),...(labelEn?{labelEn}:{}),...(instructionsAr?{instructionsAr}:{}),...(instructionsEn?{instructionsEn}:{}),isRequired:readBoolean(r,'isRequired'),isActive:readBoolean(r,'isActive'),minFiles,maxFiles,sortOrder:readNumber(r,'sortOrder',{integer:true,min:0,max:100000})};
});

export function categorySupports(capabilities: DirectoryCategoryCapabilitiesDTO, capability: keyof DirectoryCategoryCapabilitiesDTO): boolean {
  return capabilities[capability] === true;
}
