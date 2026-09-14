import test from 'node:test';
import assert from 'node:assert/strict';
import { isMaintenanceBypassRoute, normalizeApiPath } from '../../.tmp-security-core/maintenance-mode.policy.js';

test('maintenance path normalization removes API prefix and query',()=>{
  assert.equal(normalizeApiPath('/api/v1/config/public?x=1'),'/config/public');
});

test('health, public config and admin recovery paths remain available during maintenance',()=>{
  assert.equal(isMaintenanceBypassRoute('/api/v1/health/ready'),true);
  assert.equal(isMaintenanceBypassRoute('/api/v1/config/public'),true);
  assert.equal(isMaintenanceBypassRoute('/api/v1/auth/admin/refresh','POST'),true);
  assert.equal(isMaintenanceBypassRoute('/api/v1/admin/settings/maintenanceMode','PATCH'),true);
});

test('ordinary public and authenticated user routes are blocked candidates during maintenance',()=>{
  assert.equal(isMaintenanceBypassRoute('/api/v1/directory/categories?provinceId=1'),false);
  assert.equal(isMaintenanceBypassRoute('/api/v1/users/me'),false);
  assert.equal(isMaintenanceBypassRoute('/api/v1/auth/login','POST'),false);
});

test('cors preflight stays available',()=>assert.equal(isMaintenanceBypassRoute('/api/v1/users/me','OPTIONS'),true));
