import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { DirectoryModule } from '../directory/directory.module.js';
import { FacilitiesController } from './facilities.controller.js';
import { FacilityApplicationService } from './facility-application.service.js';
import { FacilityPermissionService } from './facility-permission.service.js';
import { FacilityImageController } from './facility-image.controller.js';
import { FacilityImageService } from './facility-image.service.js';
import { FacilityVerificationController } from './facility-verification.controller.js';
import { FacilityVerificationService } from './facility-verification.service.js';

@Module({
  imports: [AuthModule, LocationsModule, DirectoryModule],
  controllers: [FacilitiesController, FacilityImageController, FacilityVerificationController],
  providers: [FacilityApplicationService, FacilityPermissionService, FacilityImageService, FacilityVerificationService],
  exports: [FacilityApplicationService, FacilityPermissionService, FacilityVerificationService],
})
export class FacilitiesModule {}
