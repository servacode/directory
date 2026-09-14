import{Controller,Get,Param,Query}from'@nestjs/common';import{parseIdentifier}from'@health/contracts';import{DirectoryCatalogService}from'./directory-catalog.service.js';
@Controller('directory/categories')export class PublicDirectoryCategoriesController{constructor(private readonly catalog:DirectoryCatalogService){}
@Get()list(@Query('provinceId')provinceId:string,@Query('purpose')purpose?:string){const p=parseIdentifier(provinceId,'$.provinceId');return this.catalog.listForProvince(p,purpose==='registration'?'registration':'public')}
@Get(':id/verification-requirements')requirements(@Param('id')id:string){return this.catalog.listVerificationRequirements(parseIdentifier(id,'$.id'),true)}
}
