import{Body,Controller,Get,Param,Patch,Post,Put,Query,UseGuards}from'@nestjs/common';
import{categoryProvinceActivationRequestSchema,createDirectoryCategoryGroupRequestSchema,createDirectoryCategoryRequestSchema,parseIdentifier,updateDirectoryCategoryGroupRequestSchema,updateDirectoryCategoryRequestSchema,upsertVerificationRequirementRequestSchema}from'@health/contracts';
import type{AuthenticatedPrincipal}from'../auth/core/ports.js';
import{AccessTokenGuard}from'../auth/http/access-token.guard.js';import{CurrentPrincipal}from'../auth/http/current-principal.decorator.js';import{RequireRoles,RoleGuard}from'../auth/http/roles.js';import{DirectoryCatalogService}from'./directory-catalog.service.js';
@UseGuards(AccessTokenGuard,RoleGuard)@RequireRoles('ADMIN')@Controller('admin/directory')export class AdminDirectoryCategoriesController{constructor(private readonly catalog:DirectoryCatalogService){}
@Get('groups')groups(){return this.catalog.listGroups(true)}
@Post('groups')createGroup(@CurrentPrincipal()p:AuthenticatedPrincipal,@Body()body:unknown){return this.catalog.createGroup(createDirectoryCategoryGroupRequestSchema.parse(body),p.userId)}
@Patch('groups/:id')updateGroup(@CurrentPrincipal()p:AuthenticatedPrincipal,@Param('id')id:string,@Body()body:unknown){return this.catalog.updateGroup(parseIdentifier(id,'$.id'),updateDirectoryCategoryGroupRequestSchema.parse(body),p.userId)}
@Get('categories')list(@Query('provinceId')provinceId?:string){return this.catalog.listAdmin(provinceId?parseIdentifier(provinceId,'$.provinceId'):undefined)}
@Post('categories')create(@CurrentPrincipal()p:AuthenticatedPrincipal,@Body()body:unknown){return this.catalog.createGeneric(createDirectoryCategoryRequestSchema.parse(body),p.userId)}
@Patch('categories/:id')update(@CurrentPrincipal()p:AuthenticatedPrincipal,@Param('id')id:string,@Body()body:unknown){return this.catalog.updateCategory(parseIdentifier(id,'$.id'),updateDirectoryCategoryRequestSchema.parse(body),p.userId)}
@Put('categories/:id/provinces/:provinceId')activate(@CurrentPrincipal()p:AuthenticatedPrincipal,@Param('id')id:string,@Param('provinceId')provinceId:string,@Body()body:unknown){return this.catalog.setProvinceActivation(parseIdentifier(id,'$.id'),parseIdentifier(provinceId,'$.provinceId'),categoryProvinceActivationRequestSchema.parse(body),p.userId)}
@Get('categories/:id/verification-requirements')requirements(@Param('id')id:string){return this.catalog.listVerificationRequirements(parseIdentifier(id,'$.id'),false)}
@Post('categories/:id/verification-requirements')createRequirement(@CurrentPrincipal()p:AuthenticatedPrincipal,@Param('id')id:string,@Body()body:unknown){return this.catalog.upsertRequirement(parseIdentifier(id,'$.id'),undefined,upsertVerificationRequirementRequestSchema.parse(body),p.userId)}
@Patch('categories/:id/verification-requirements/:requirementId')updateRequirement(@CurrentPrincipal()p:AuthenticatedPrincipal,@Param('id')id:string,@Param('requirementId')requirementId:string,@Body()body:unknown){return this.catalog.upsertRequirement(parseIdentifier(id,'$.id'),parseIdentifier(requirementId,'$.requirementId'),upsertVerificationRequirementRequestSchema.parse(body),p.userId)}
}
