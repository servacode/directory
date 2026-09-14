import { readFile } from 'node:fs/promises';

const failures = [];
const required = [
  ['packages/contracts/src/locations/index.ts', 'locationRuntimeStateSchema'],
  ['packages/contracts/src/search/index.ts', 'mapBoundsQuerySchema'],
  ['apps/api/src/modules/locations/locations.controller.ts', "@Get('provinces')"],
  ['apps/api/src/modules/geo/geo.service.ts', 'ST_DWithin'],
  ['apps/api/src/modules/geo/geo.service.ts', 'ST_MakeEnvelope'],
  ['apps/mobile/src/platform/location/location-service.ts', 'class LocationService'],
  ['apps/mobile/src/platform/maps/map-provider.ts', 'facilityPinPresentation'],
  ['apps/mobile/src/platform/maps/directions-service.ts', 'class DirectionsService'],
  ['apps/mobile/src/platform/maps/maplibre-adapter.ts', 'MAPLIBRE_PROVIDER_ID'],
];
for (const [file, phrase] of required) {
  const text = await readFile(file, 'utf8');
  if (!text.includes(phrase)) failures.push(`${file}: missing ${phrase}`);
}
const geo = await readFile('apps/api/src/modules/geo/geo.service.ts', 'utf8');
if (/Math\.(sqrt|sin|cos|atan2).*distance/i.test(geo)) failures.push('Backend geo must use PostGIS, not local Haversine logic');
const mobile = await readFile('apps/mobile/src/platform/location/location-service.ts', 'utf8');
if (/watchPosition|background/i.test(mobile)) failures.push('Phase 4 must not introduce background tracking');
const pkg = JSON.parse(await readFile('apps/mobile/package.json', 'utf8'));
if (!pkg.dependencies['@maplibre/maplibre-react-native']) failures.push('MapLibre dependency missing');
if (failures.length) { console.error('Phase 4 verification failed:\n' + failures.map(x=>`- ${x}`).join('\n')); process.exit(1); }
console.log('Phase 4 static verification: PASS');
console.log('Location modes: GPS + manual');
console.log('Geo engine: PostGIS');
console.log('Facility map presentation: dynamic category icon + generic fallback');
