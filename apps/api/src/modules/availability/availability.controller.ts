import { Body,Controller,Get,Param,Post,UseGuards } from '@nestjs/common';
import { parseIdentifier,temporaryClosureRequestSchema } from '@health/contracts';
import type { AuthenticatedPrincipal } from '../auth/core/ports.js';
import { AccessTokenGuard } from '../auth/http/access-token.guard.js';
import { CurrentPrincipal } from '../auth/http/current-principal.decorator.js';
import { TemporaryClosureService } from './temporary-closure.service.js';
@UseGuards(AccessTokenGuard)
@Controller('facilities/:facilityId/temporary-closures')
export class AvailabilityController{
 constructor(private readonly closures:TemporaryClosureService){}
 @Get('active') active(@CurrentPrincipal() p:AuthenticatedPrincipal,@Param('facilityId') facilityId:string){return this.closures.active(p.userId,parseIdentifier(facilityId,'$.facilityId'));}
 @Post() create(@CurrentPrincipal() p:AuthenticatedPrincipal,@Param('facilityId') facilityId:string,@Body() body:unknown){return this.closures.create(p.userId,parseIdentifier(facilityId,'$.facilityId'),temporaryClosureRequestSchema.parse(body));}
 @Post(':closureId/cancel') cancel(@CurrentPrincipal() p:AuthenticatedPrincipal,@Param('facilityId') facilityId:string,@Param('closureId') closureId:string){return this.closures.cancel(p.userId,parseIdentifier(facilityId,'$.facilityId'),parseIdentifier(closureId,'$.closureId'));}
}
