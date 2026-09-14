import test from 'node:test';
import assert from 'node:assert/strict';
import { canReviewApplication,canSuspendFacility,canReactivateFacility } from '../../../.tmp-admin-core/apps/api/src/modules/admin/admin-review-policy.js';
test('only pending application + pending review facility can be reviewed',()=>{assert.equal(canReviewApplication('PENDING','PENDING_REVIEW'),true);assert.equal(canReviewApplication('APPROVED','ACTIVE'),false);assert.equal(canReviewApplication('PENDING','ACTIVE'),false)});
test('only active facility can be suspended',()=>{assert.equal(canSuspendFacility('ACTIVE'),true);assert.equal(canSuspendFacility('SUSPENDED'),false)});
test('only suspended facility can be reactivated',()=>{assert.equal(canReactivateFacility('SUSPENDED'),true);assert.equal(canReactivateFacility('ACTIVE'),false)});
