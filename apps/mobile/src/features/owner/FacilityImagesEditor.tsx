import React,{useState}from'react';
import{Image,StyleSheet,View}from'react-native';
import{launchImageLibrary}from'react-native-image-picker';
import type{FacilityImageDTO}from'@health/contracts';
import{radius,semanticColors,spacing}from'@health/design-tokens';
import{defaultLocale,t}from'@health/i18n';
import type{OwnerApi}from'../../api/owner-api.js';
import{resolveApiAssetUrl}from'../../platform/network/asset-url.js';
import{AppButton}from'../../ui/AppButton.js';
import{AppText}from'../../ui/AppText.js';

export function FacilityImagesEditor({facilityId,ownerApi,images,onChange}:{facilityId:string;ownerApi:OwnerApi;images:readonly FacilityImageDTO[];onChange:(images:readonly FacilityImageDTO[])=>void}){
 const[busy,setBusy]=useState(false);const[message,setMessage]=useState<string>();
 const refresh=async()=>onChange(await ownerApi.images(facilityId));
 const upload=async()=>{setMessage(undefined);const result=await launchImageLibrary({mediaType:'photo',selectionLimit:1,quality:.85});const asset=result.assets?.[0];if(!asset?.uri)return;setBusy(true);try{await ownerApi.uploadImage(facilityId,{uri:asset.uri,type:asset.type??'image/jpeg',name:asset.fileName??'facility.jpg'});await refresh()}catch{setMessage(t(defaultLocale,'facility.imageUploadFailed'))}finally{setBusy(false)}};
 const primary=async(id:string)=>{setBusy(true);try{await ownerApi.primaryImage(facilityId,id);await refresh()}finally{setBusy(false)}};
 const remove=async(id:string)=>{setBusy(true);try{await ownerApi.deleteImage(facilityId,id);await refresh()}finally{setBusy(false)}};
 const move=async(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=images.length)return;const ids=images.map(x=>x.id);[ids[index],ids[target]]=[ids[target]!,ids[index]!];setBusy(true);try{await ownerApi.reorderImages(facilityId,ids);await refresh()}finally{setBusy(false)}};
 return <View style={styles.wrap}><AppText style={styles.heading}>{t(defaultLocale,'facility.images')}</AppText><AppText style={styles.hint}>{t(defaultLocale,'facility.imagesHint')}</AppText>{message?<AppText style={styles.error}>{message}</AppText>:null}<AppButton label={t(defaultLocale,'facility.addImage')} icon="image" variant="secondary" disabled={busy} onPress={()=>void upload()}/><View style={styles.list}>{images.map((image,index)=>{const uri=resolveApiAssetUrl(image.url);return <View key={image.id} style={styles.item}>{uri?<Image source={{uri}} style={styles.image}/>:null}<View style={styles.actions}>{image.isPrimary?<AppText style={styles.primary}>{t(defaultLocale,'facility.primaryImage')}</AppText>:<AppButton label={t(defaultLocale,'facility.makePrimary')} variant="ghost" onPress={()=>void primary(image.id)}/>}<View style={styles.order}><AppButton label={t(defaultLocale,'action.moveEarlier')} variant="ghost" disabled={index===0||busy} onPress={()=>void move(index,-1)}/><AppButton label={t(defaultLocale,'action.moveLater')} variant="ghost" disabled={index===images.length-1||busy} onPress={()=>void move(index,1)}/></View><AppButton label={t(defaultLocale,'action.delete')} icon="delete" variant="ghost" disabled={busy} onPress={()=>void remove(image.id)}/></View></View>})}</View></View>;
}
const styles=StyleSheet.create({wrap:{gap:spacing.md},heading:{fontWeight:'900',fontSize:18},hint:{color:semanticColors.textSecondary,fontSize:13},error:{color:semanticColors.danger},list:{gap:spacing.md},item:{padding:spacing.sm,borderWidth:1,borderColor:semanticColors.border,borderRadius:radius.lg,backgroundColor:semanticColors.surface,gap:spacing.sm},image:{width:'100%',height:170,borderRadius:radius.md,backgroundColor:semanticColors.surfaceSecondary},actions:{gap:spacing.xs},order:{flexDirection:'row-reverse',gap:spacing.xs},primary:{color:semanticColors.primary,fontWeight:'800'}});
