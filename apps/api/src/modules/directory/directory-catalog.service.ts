import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  CategoryProvinceActivationRequest,
  CategoryVerificationRequirementDTO,
  CreateDirectoryCategoryGroupRequest,
  CreateDirectoryCategoryRequest,
  DirectoryCategoryDTO,
  DirectoryCategoryGroupDTO,
  UpdateDirectoryCategoryGroupRequest,
  UpdateDirectoryCategoryRequest,
  UpsertVerificationRequirementRequest,
} from '@health/contracts';
import { DatabaseService } from '../../database/database.service.js';
import { FacilityDomainError } from '../facilities/facility-domain.error.js';

interface CategoryRow {
  id:string;groupId:string;groupCode:string;groupNameAr:string;groupNameEn:string|null;code:string;slug:string;nameAr:string;nameEn:string|null;iconKey:string;
  specialization:DirectoryCategoryDTO['specialization'];capabilities:DirectoryCategoryDTO['capabilities'];isActive:boolean;
  publicEnabled:boolean;ownerRegistrationEnabled:boolean;sortOrder:number;
}
interface GroupRow {id:string;code:string;nameAr:string;nameEn:string|null;isActive:boolean;sortOrder:number}

@Injectable()
export class DirectoryCatalogService {
  constructor(private readonly db:DatabaseService){}

  private toCategory(row:CategoryRow):DirectoryCategoryDTO{
    return {id:row.id,groupId:row.groupId,groupCode:row.groupCode,groupNameAr:row.groupNameAr,...(row.groupNameEn?{groupNameEn:row.groupNameEn}:{}),code:row.code,slug:row.slug,nameAr:row.nameAr,
      ...(row.nameEn?{nameEn:row.nameEn}:{}),iconKey:row.iconKey,specialization:row.specialization,capabilities:row.capabilities,
      isActive:row.isActive,publicEnabled:row.publicEnabled,ownerRegistrationEnabled:row.ownerRegistrationEnabled,sortOrder:row.sortOrder};
  }
  private toGroup(row:GroupRow):DirectoryCategoryGroupDTO{return{id:row.id,code:row.code,nameAr:row.nameAr,...(row.nameEn?{nameEn:row.nameEn}:{}),isActive:row.isActive,sortOrder:row.sortOrder}}

  async listGroups(includeInactive=false):Promise<readonly DirectoryCategoryGroupDTO[]>{
    const r=await this.db.query<GroupRow>(`SELECT id,code,name_ar AS "nameAr",name_en AS "nameEn",is_active AS "isActive",sort_order AS "sortOrder" FROM directory_category_groups ${includeInactive?'':'WHERE is_active=TRUE'} ORDER BY sort_order,name_ar`);
    return r.rows.map(x=>this.toGroup(x));
  }

  async createGroup(input:CreateDirectoryCategoryGroupRequest,actorUserId?:string){
    const id=randomUUID(),token=id.replaceAll('-','').slice(0,10).toUpperCase(),code=input.code??`GROUP_${token}`;
    await this.db.query(`INSERT INTO directory_category_groups(id,code,name_ar,name_en,is_active,sort_order) VALUES($1,$2,$3,$4,TRUE,$5)`,[id,code,input.nameAr,input.nameEn??null,input.sortOrder]);
    await this.audit(actorUserId,'DIRECTORY_GROUP_CREATED','DIRECTORY_GROUP',id,{code,nameAr:input.nameAr});
    return{id};
  }

  async updateGroup(id:string,input:UpdateDirectoryCategoryGroupRequest,actorUserId?:string){
    const r=await this.db.query(`UPDATE directory_category_groups SET name_ar=$2,name_en=$3,is_active=$4,sort_order=$5 WHERE id=$1`,[id,input.nameAr,input.nameEn??null,input.isActive,input.sortOrder]);
    if(!r.rowCount)throw new FacilityDomainError('NOT_FOUND','Directory category group not found.');
    await this.audit(actorUserId,'DIRECTORY_GROUP_UPDATED','DIRECTORY_GROUP',id,{isActive:input.isActive});
    return{ok:true as const};
  }

  async listForProvince(provinceId:string,purpose:'public'|'registration'):Promise<readonly DirectoryCategoryDTO[]>{
    const flag=purpose==='public'?'dcp.public_enabled':'dcp.owner_registration_enabled';
    const result=await this.db.query<CategoryRow>(`SELECT c.id,c.group_id AS "groupId",g.code AS "groupCode",g.name_ar AS "groupNameAr",g.name_en AS "groupNameEn",c.code,c.slug,c.name_ar AS "nameAr",c.name_en AS "nameEn",c.icon_key AS "iconKey",c.specialization,c.capabilities,c.is_active AS "isActive",dcp.public_enabled AS "publicEnabled",dcp.owner_registration_enabled AS "ownerRegistrationEnabled",c.sort_order AS "sortOrder"
      FROM directory_categories c JOIN directory_category_groups g ON g.id=c.group_id
      JOIN directory_category_provinces dcp ON dcp.category_id=c.id AND dcp.province_id=$1
      JOIN provinces p ON p.id=dcp.province_id
      WHERE c.is_active=TRUE AND g.is_active=TRUE AND p.is_active=TRUE AND ${flag}=TRUE
      ORDER BY g.sort_order,c.sort_order,c.name_ar`,[provinceId]);
    return result.rows.map(x=>this.toCategory(x));
  }

  async get(categoryId:string):Promise<DirectoryCategoryDTO>{
    const r=await this.db.query<CategoryRow>(`SELECT c.id,c.group_id AS "groupId",g.code AS "groupCode",g.name_ar AS "groupNameAr",g.name_en AS "groupNameEn",c.code,c.slug,c.name_ar AS "nameAr",c.name_en AS "nameEn",c.icon_key AS "iconKey",c.specialization,c.capabilities,c.is_active AS "isActive",FALSE AS "publicEnabled",FALSE AS "ownerRegistrationEnabled",c.sort_order AS "sortOrder" FROM directory_categories c JOIN directory_category_groups g ON g.id=c.group_id WHERE c.id=$1`,[categoryId]);
    const row=r.rows[0];if(!row)throw new FacilityDomainError('NOT_FOUND','Directory category not found.');return this.toCategory(row);
  }

  async assertRegistrationEnabled(categoryId:string,provinceId:string){
    const r=await this.db.query<CategoryRow>(`SELECT c.id,c.group_id AS "groupId",g.code AS "groupCode",g.name_ar AS "groupNameAr",g.name_en AS "groupNameEn",c.code,c.slug,c.name_ar AS "nameAr",c.name_en AS "nameEn",c.icon_key AS "iconKey",c.specialization,c.capabilities,c.is_active AS "isActive",dcp.public_enabled AS "publicEnabled",dcp.owner_registration_enabled AS "ownerRegistrationEnabled",c.sort_order AS "sortOrder" FROM directory_categories c JOIN directory_category_groups g ON g.id=c.group_id JOIN directory_category_provinces dcp ON dcp.category_id=c.id AND dcp.province_id=$2 JOIN provinces p ON p.id=dcp.province_id WHERE c.id=$1 AND c.is_active=TRUE AND g.is_active=TRUE AND p.is_active=TRUE AND dcp.owner_registration_enabled=TRUE`,[categoryId,provinceId]);
    const row=r.rows[0];if(!row)throw new FacilityDomainError('FEATURE_DISABLED','Registration is not enabled for this category in the selected province.');return this.toCategory(row);
  }

  async listVerificationRequirements(categoryId:string,onlyActive=true):Promise<readonly CategoryVerificationRequirementDTO[]>{
    const active=onlyActive?' AND is_active=TRUE':'';
    const r=await this.db.query<any>(`SELECT id,category_id AS "categoryId",code,label_ar AS "labelAr",label_en AS "labelEn",instructions_ar AS "instructionsAr",instructions_en AS "instructionsEn",evidence_kind AS "evidenceKind",is_required AS "isRequired",is_active AS "isActive",min_files AS "minFiles",max_files AS "maxFiles",sort_order AS "sortOrder" FROM category_verification_requirements WHERE category_id=$1${active} ORDER BY sort_order,code`,[categoryId]);
    return r.rows;
  }

  /** Province rows are the sole public/registration activation source of truth. */
  async listAdmin(provinceId?:string):Promise<readonly DirectoryCategoryDTO[]>{
    const params:unknown[]=[];let join='';let provinceSelect='FALSE AS "publicEnabled",FALSE AS "ownerRegistrationEnabled"';
    if(provinceId){params.push(provinceId);join=' LEFT JOIN directory_category_provinces dcp ON dcp.category_id=c.id AND dcp.province_id=$1';provinceSelect='COALESCE(dcp.public_enabled,FALSE) AS "publicEnabled",COALESCE(dcp.owner_registration_enabled,FALSE) AS "ownerRegistrationEnabled"';}
    const r=await this.db.query<CategoryRow>(`SELECT c.id,c.group_id AS "groupId",g.code AS "groupCode",g.name_ar AS "groupNameAr",g.name_en AS "groupNameEn",c.code,c.slug,c.name_ar AS "nameAr",c.name_en AS "nameEn",c.icon_key AS "iconKey",c.specialization,c.capabilities,c.is_active AS "isActive",${provinceSelect},c.sort_order AS "sortOrder" FROM directory_categories c JOIN directory_category_groups g ON g.id=c.group_id${join} ORDER BY g.sort_order,c.sort_order,c.name_ar`,params);
    return r.rows.map(x=>this.toCategory(x));
  }

  async createGeneric(input:CreateDirectoryCategoryRequest,actorUserId?:string){
    const id=randomUUID(),token=id.replaceAll('-','').slice(0,10),code=input.code??`CATEGORY_${token.toUpperCase()}`,slug=input.slug??`category-${token}`;
    await this.db.transaction(async client=>{
      const group=await client.query(`SELECT 1 FROM directory_category_groups WHERE id=$1 AND is_active=TRUE`,[input.groupId]);
      if(!group.rows[0])throw new FacilityDomainError('VALIDATION_ERROR','Directory category group is invalid or inactive.');
      await client.query(`INSERT INTO directory_categories(id,group_id,code,slug,name_ar,name_en,icon_key,specialization,capabilities,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,'GENERIC','{"businessHours":true,"photos":true,"ratings":true}'::jsonb,TRUE,$8)`,[id,input.groupId,code,slug,input.nameAr,input.nameEn??null,input.iconKey,input.sortOrder]);
      await client.query(`INSERT INTO directory_category_provinces(category_id,province_id,public_enabled,owner_registration_enabled) SELECT $1,id,FALSE,FALSE FROM provinces ON CONFLICT DO NOTHING`,[id]);
      await client.query(`INSERT INTO category_verification_requirements(id,category_id,code,label_ar,label_en,instructions_ar,evidence_kind,is_required,is_active,min_files,max_files,sort_order) VALUES
        ($1,$3,'STOREFRONT_PHOTO','صورة واجهة المنشأة','Storefront photo','صورة واضحة للواجهة واللافتة بحيث يمكن مطابقة اسم وموقع المنشأة.','IMAGE',TRUE,TRUE,1,1,10),
        ($2,$3,'BUSINESS_CARD','صورة كرت المنشأة','Business card','صورة واضحة لكرت المنشأة المستخدم لإثبات بياناتها.','IMAGE',TRUE,TRUE,1,1,20)`,[randomUUID(),randomUUID(),id]);
    });
    await this.audit(actorUserId,'DIRECTORY_CATEGORY_CREATED','DIRECTORY_CATEGORY',id,{code,nameAr:input.nameAr});
    return{id};
  }

  async updateCategory(id:string,input:UpdateDirectoryCategoryRequest,actorUserId?:string){
    const r=await this.db.query(`UPDATE directory_categories c SET group_id=$2,name_ar=$3,name_en=$4,icon_key=$5,is_active=$6,sort_order=$7 WHERE c.id=$1 AND EXISTS(SELECT 1 FROM directory_category_groups g WHERE g.id=$2)`,[id,input.groupId,input.nameAr,input.nameEn??null,input.iconKey,input.isActive,input.sortOrder]);
    if(!r.rowCount)throw new FacilityDomainError('NOT_FOUND','Directory category or target group not found.');
    await this.audit(actorUserId,'DIRECTORY_CATEGORY_UPDATED','DIRECTORY_CATEGORY',id,{groupId:input.groupId,isActive:input.isActive});
    return{ok:true as const};
  }

  async setProvinceActivation(categoryId:string,provinceId:string,input:CategoryProvinceActivationRequest,actorUserId?:string){
    const r=await this.db.query(`INSERT INTO directory_category_provinces(category_id,province_id,public_enabled,owner_registration_enabled) SELECT $1,$2,$3,$4 WHERE EXISTS(SELECT 1 FROM directory_categories WHERE id=$1) AND EXISTS(SELECT 1 FROM provinces WHERE id=$2) ON CONFLICT(category_id,province_id) DO UPDATE SET public_enabled=EXCLUDED.public_enabled,owner_registration_enabled=EXCLUDED.owner_registration_enabled,updated_at=NOW()`,[categoryId,provinceId,input.publicEnabled,input.ownerRegistrationEnabled]);
    if(!r.rowCount)throw new FacilityDomainError('VALIDATION_ERROR','Category or province does not exist.');
    await this.audit(actorUserId,'DIRECTORY_CATEGORY_PROVINCE_ACTIVATION_UPDATED','DIRECTORY_CATEGORY',categoryId,{provinceId,...input});
    return{ok:true as const};
  }

  async upsertRequirement(categoryId:string,id:string|undefined,input:UpsertVerificationRequirementRequest,actorUserId?:string){
    const requirementId=id??randomUUID(),code=input.code??`EVIDENCE_${requirementId.replaceAll('-','').slice(0,10).toUpperCase()}`;
    const r=await this.db.query(`INSERT INTO category_verification_requirements(id,category_id,code,label_ar,label_en,instructions_ar,instructions_en,evidence_kind,is_required,is_active,min_files,max_files,sort_order) SELECT $1,$2,$3,$4,$5,$6,$7,'IMAGE',$8,$9,$10,$11,$12 WHERE EXISTS(SELECT 1 FROM directory_categories WHERE id=$2) ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,label_ar=EXCLUDED.label_ar,label_en=EXCLUDED.label_en,instructions_ar=EXCLUDED.instructions_ar,instructions_en=EXCLUDED.instructions_en,is_required=EXCLUDED.is_required,is_active=EXCLUDED.is_active,min_files=EXCLUDED.min_files,max_files=EXCLUDED.max_files,sort_order=EXCLUDED.sort_order WHERE category_verification_requirements.category_id=EXCLUDED.category_id`,[requirementId,categoryId,code,input.labelAr,input.labelEn??null,input.instructionsAr??null,input.instructionsEn??null,input.isRequired,input.isActive,input.minFiles,input.maxFiles,input.sortOrder]);
    if(!r.rowCount)throw new FacilityDomainError('VALIDATION_ERROR','Directory category does not exist or requirement belongs to another category.');
    await this.audit(actorUserId,id?'DIRECTORY_VERIFICATION_REQUIREMENT_UPDATED':'DIRECTORY_VERIFICATION_REQUIREMENT_CREATED','DIRECTORY_CATEGORY',categoryId,{requirementId,isRequired:input.isRequired,isActive:input.isActive});
    return{id:requirementId};
  }
  private async audit(actorUserId:string|undefined,action:string,entityType:string,entityId:string,metadata:Record<string,unknown>){
    if(!actorUserId)return;
    await this.db.query(`INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)`,[randomUUID(),actorUserId,action,entityType,entityId,JSON.stringify(metadata)]);
  }

}
