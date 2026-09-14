import { mobileRuntimeConfig } from '../../config/runtime.js';
export function resolveApiAssetUrl(path?:string):string|undefined{
  if(!path)return undefined;
  if(/^https?:\/\//i.test(path))return path;
  const origin=mobileRuntimeConfig.apiBaseUrl.replace(/\/api\/v1\/?$/,'');
  return `${origin}${path.startsWith('/')?'':'/'}${path}`;
}
