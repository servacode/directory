// Native MapLibre integration boundary.
// The concrete component is intentionally isolated here so feature screens never import
// @maplibre/maplibre-react-native directly. Native wiring is finalized once dependencies
// can be installed and the Android template is available in the build environment.
export const MAPLIBRE_PROVIDER_ID = 'maplibre' as const;
