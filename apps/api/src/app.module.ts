import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { LocationsModule } from './modules/locations/locations.module.js';
import { GeoModule } from './modules/geo/geo.module.js';
import { FacilitiesModule } from './modules/facilities/facilities.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AvailabilityModule } from './modules/availability/availability.module.js';
import { DutyModule } from './modules/duty/duty.module.js';
import { DiscoveryModule } from './modules/discovery/discovery.module.js';
import { DirectoryModule } from './modules/directory/directory.module.js';
import { PlatformSettingsModule } from './modules/settings/platform-settings.module.js';
import { StorageModule } from './storage/storage.module.js';
import { AccountModule } from './modules/account/account.module.js';
import { RatingsModule } from './modules/ratings/ratings.module.js';
import { SecurityModule } from './security/security.module.js';
import { MaintenanceModeGuard } from './security/maintenance-mode.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule,
    SecurityModule,
    PlatformSettingsModule,
    AuthModule,
    LocationsModule,
    GeoModule,
    FacilitiesModule,
    AdminModule,
    AvailabilityModule,
    DutyModule,
    StorageModule,
    AccountModule,
    RatingsModule,
    DirectoryModule,
    DiscoveryModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: MaintenanceModeGuard }],
})
export class AppModule {}
