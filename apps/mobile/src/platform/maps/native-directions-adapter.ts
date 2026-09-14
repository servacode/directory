import { Linking, Platform } from 'react-native';
import type { CoordinatesDTO } from '@health/contracts';
import type { DirectionsAdapter } from './directions-service.js';
export class NativeDirectionsAdapter implements DirectionsAdapter {
  async openExternalDirections(destination:CoordinatesDTO,label?:string):Promise<boolean>{
    const query=encodeURIComponent(label?.trim()||`${destination.latitude},${destination.longitude}`);
    const url=Platform.OS==='android'
      ?`geo:${destination.latitude},${destination.longitude}?q=${destination.latitude},${destination.longitude}(${query})`
      :`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;
    if(!(await Linking.canOpenURL(url)))return false;
    await Linking.openURL(url);return true;
  }
}
