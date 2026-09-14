import test from'node:test';import assert from'node:assert/strict';import{discoveryPolicy,emptyStateKey}from'../../../.tmp-discovery-core/apps/mobile/src/features/discovery/discovery-policy.js';
const generic={specialization:'GENERIC',capabilities:{businessHours:true,photos:true,ratings:true}};
test('generic category does not invent specialized filters',()=>assert.deepEqual(discoveryPolicy(generic),{requiresSpecialty:false,allowsDutyFilter:false,allowsServiceFilter:false}));
test('capabilities drive discovery filters',()=>assert.deepEqual(discoveryPolicy({...generic,capabilities:{...generic.capabilities,duty:true,specialtyFilter:true,serviceFilter:true}}),{requiresSpecialty:true,allowsDutyFilter:true,allowsServiceFilter:true}));
test('generic categories share generic empty state',()=>assert.equal(emptyStateKey(generic),'discovery.empty.category'));
test('pharmacy duty uses duty-specific empty state',()=>assert.equal(emptyStateKey({specialization:'PHARMACY',capabilities:{...generic.capabilities,duty:true}},true),'discovery.empty.dutyPharmacies'));
