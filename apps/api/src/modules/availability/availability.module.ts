import { Module } from '@nestjs/common';
import { FacilitiesModule } from '../facilities/facilities.module.js';
import { AvailabilityController } from './availability.controller.js';
import { FacilityAvailabilityService } from './facility-availability.service.js';
import { TemporaryClosureService } from './temporary-closure.service.js';
@Module({imports:[FacilitiesModule],controllers:[AvailabilityController],providers:[FacilityAvailabilityService,TemporaryClosureService],exports:[FacilityAvailabilityService]})
export class AvailabilityModule{}
