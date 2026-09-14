import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import type { CoordinatesDTO } from '@health/contracts';
import { radius, semanticColors } from '@health/design-tokens';
import { mobileRuntimeConfig } from '../../config/runtime.js';
import { AppIcon } from '../../ui/AppIcon.js';

interface MapPressEvent { readonly nativeEvent: { readonly lngLat: readonly [number,number] } }
export function MapLocationPicker({value,center,onChange}:{value?:CoordinatesDTO;center:CoordinatesDTO;onChange:(value:CoordinatesDTO)=>void}){
  const selected=value??center;
  return <View style={styles.frame}><Map mapStyle={mobileRuntimeConfig.mapStyleUrl} style={styles.map} onPress={(event:MapPressEvent)=>{const [longitude,latitude]=event.nativeEvent.lngLat;onChange({latitude,longitude});}}>
    <Camera initialViewState={{center:[selected.longitude,selected.latitude],zoom:15}}/>
    <Marker id="facility-location-selection" lngLat={[selected.longitude,selected.latitude]}>
      <View style={styles.marker}><AppIcon name="location" size={22} color={semanticColors.surface}/></View>
    </Marker>
  </Map></View>;
}
const styles=StyleSheet.create({frame:{height:320,borderRadius:radius.lg,overflow:'hidden',borderWidth:1,borderColor:semanticColors.border},map:{flex:1},marker:{width:42,height:42,borderRadius:radius.pill,backgroundColor:semanticColors.primary,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:semanticColors.surface}});
