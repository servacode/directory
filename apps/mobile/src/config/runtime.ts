import Config from 'react-native-config';
const apiBaseUrl=(Config.API_URL??'').replace(/\/$/,'');
const mapStyleUrl=(Config.MAP_STYLE_URL??'').trim();
if(!apiBaseUrl)throw new Error('API_URL is required');
if(!mapStyleUrl)throw new Error('MAP_STYLE_URL is required');
export const mobileRuntimeConfig={apiBaseUrl,mapStyleUrl} as const;
