import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FACILITY_SPECIALIZATIONS,
  canTransitionFacilityStatus,
  registerRequestSchema,
  createFacilityDraftRequestSchema,
  createDirectoryCategoryRequestSchema,
  updateDirectoryCategoryRequestSchema,
  updateDirectoryCategoryGroupRequestSchema,
  categoryProvinceActivationRequestSchema,
  upsertVerificationRequirementRequestSchema,
  facilityDiscoveryQuerySchema,
  putRatingRequestSchema,
  updateBusinessHoursRequestSchema,
  createDutyShiftRequestSchema,
  updateNursingCenterProfileRequestSchema,
  ERROR_HTTP_STATUS,
} from '../dist/index.js';
const provinceId='11111111-1111-4111-8111-111111111111';
const categoryId='22222222-2222-4222-8222-222222222222';
const groupId='33333333-3333-4333-8333-333333333333';
const nursingServiceId='44444444-4444-4444-8444-444444444444';
test('technical specializations are not the public category taxonomy',()=>assert.deepEqual(FACILITY_SPECIALIZATIONS,['GENERIC','PHARMACY','MEDICAL_CLINIC','NURSING_CENTER']));
test('registration accepts Syrian local and international mobile formats',()=>{assert.equal(registerRequestSchema.parse({fullName:'محمد الرحال',phone:'0987654321',provinceId,password:'password123'}).phone,'0987654321');assert.equal(registerRequestSchema.parse({fullName:'محمد الرحال',phone:'+963987654321',provinceId,password:'password123'}).phone,'+963987654321')});
test('registration rejects non-Syrian phone formats',()=>assert.equal(registerRequestSchema.safeParse({fullName:'Test User',phone:'+905551234567',provinceId,password:'password123'}).success,false));
test('facility draft is category-based and province-scoped',()=>assert.deepEqual(createFacilityDraftRequestSchema.parse({categoryId,provinceId}),{categoryId,provinceId}));
test('generic directory category creation can hide technical code and slug from admin UI',()=>assert.equal(createDirectoryCategoryRequestSchema.safeParse({groupId,nameAr:'ألبسة',iconKey:'store',sortOrder:10}).success,true));
test('directory category can be moved between admin-managed groups',()=>assert.equal(updateDirectoryCategoryRequestSchema.safeParse({groupId,nameAr:'ألبسة',iconKey:'store',isActive:true,sortOrder:10}).success,true));
test('directory category group update does not require a groupId in the body',()=>assert.equal(updateDirectoryCategoryGroupRequestSchema.safeParse({nameAr:'الصحة',isActive:true,sortOrder:1}).success,true));
test('directory category group update rejects unknown groupId in the body',()=>assert.equal(updateDirectoryCategoryGroupRequestSchema.safeParse({groupId,nameAr:'الصحة',isActive:true,sortOrder:1}).success,false));
test('province activation independently controls public visibility and owner onboarding',()=>assert.deepEqual(categoryProvinceActivationRequestSchema.parse({publicEnabled:true,ownerRegistrationEnabled:false}),{publicEnabled:true,ownerRegistrationEnabled:false}));
test('verification requirements support required/optional policies',()=>assert.equal(upsertVerificationRequirementRequestSchema.safeParse({labelAr:'صورة الترخيص',isRequired:true,isActive:true,minFiles:1,maxFiles:2,sortOrder:30}).success,true));
test('discovery is category-based; semantic capability rules are enforced by backend catalog',()=>assert.equal(facilityDiscoveryQuerySchema.safeParse({provinceId,categoryId}).success,true));
test('rating only accepts integer values one to five',()=>{assert.equal(putRatingRequestSchema.safeParse({score:5}).success,true);assert.equal(putRatingRequestSchema.safeParse({score:0}).success,false);assert.equal(putRatingRequestSchema.safeParse({score:3.5}).success,false)});
test('business hours require seven unique days and support overnight metadata',()=>{const days=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map(dayOfWeek=>({dayOfWeek,isClosed:false,is24Hours:false,periods:[{startTime:'20:00',endTime:'02:00',endsNextDay:true}]}));assert.equal(updateBusinessHoursRequestSchema.safeParse({days}).success,true);assert.equal(updateBusinessHoursRequestSchema.safeParse({days:days.slice(0,6)}).success,false)});
test('duty shift must end after it starts',()=>{assert.equal(createDutyShiftRequestSchema.safeParse({startsAt:'2026-09-14T20:00:00+03:00',endsAt:'2026-09-15T08:00:00+03:00'}).success,true);assert.equal(createDutyShiftRequestSchema.safeParse({startsAt:'2026-09-14T20:00:00+03:00',endsAt:'2026-09-14T19:00:00+03:00'}).success,false)});
test('nursing services reject duplicate IDs',()=>{assert.equal(updateNursingCenterProfileRequestSchema.safeParse({serviceIds:[nursingServiceId]}).success,true);assert.equal(updateNursingCenterProfileRequestSchema.safeParse({serviceIds:[nursingServiceId,nursingServiceId]}).success,false)});
test('facility state machine allows only documented transitions',()=>{assert.equal(canTransitionFacilityStatus('DRAFT','PENDING_REVIEW'),true);assert.equal(canTransitionFacilityStatus('DRAFT','ACTIVE'),false);assert.equal(canTransitionFacilityStatus('ACTIVE','REVERIFICATION_REQUIRED'),true);assert.equal(canTransitionFacilityStatus('SUSPENDED','REVERIFICATION_REQUIRED'),false);assert.equal(canTransitionFacilityStatus('SUSPENDED','ACTIVE'),true);assert.equal(canTransitionFacilityStatus('CLOSED','ACTIVE'),false)});

test('maintenance mode has a dedicated service-unavailable status',()=>assert.equal(ERROR_HTTP_STATUS.MAINTENANCE_MODE,503));
