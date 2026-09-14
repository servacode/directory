import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FacilitiesModule } from '../facilities/facilities.module.js';
import { AdminFacilitiesController } from './admin-facilities.controller.js';
import { AdminVerificationController } from './admin-verification.controller.js';
import { AdminFacilityReviewService } from './admin-facility-review.service.js';
import { FacilityDuplicateDetectionService } from './facility-duplicate-detection.service.js';
import { ReferenceDataController } from './reference-data.controller.js';
import { PublicReferenceDataController } from './public-reference-data.controller.js';
import { ReferenceDataService } from './reference-data.service.js';

@Module({
  imports: [AuthModule, FacilitiesModule],
  controllers: [AdminFacilitiesController, AdminVerificationController, ReferenceDataController, PublicReferenceDataController],
  providers: [AdminFacilityReviewService, FacilityDuplicateDetectionService, ReferenceDataService],
  exports: [AdminFacilityReviewService],
})
export class AdminModule {}
