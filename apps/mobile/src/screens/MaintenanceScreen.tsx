import React,{useState}from'react';
import{StyleSheet,View}from'react-native';
import{semanticColors,spacing}from'@health/design-tokens';
import{defaultLocale,t}from'@health/i18n';
import{AppButton}from'../ui/AppButton.js';
import{AppIcon}from'../ui/AppIcon.js';
import{AppText}from'../ui/AppText.js';
import{Screen}from'../ui/Screen.js';

export function MaintenanceScreen({onRetry}:{onRetry:()=>Promise<void>}){
  const[busy,setBusy]=useState(false);
  const retry=async()=>{setBusy(true);try{await onRetry()}finally{setBusy(false)}};
  return <Screen accessibilityLabel={t(defaultLocale,'maintenance.title')}>
    <View style={styles.content}>
      <View style={styles.icon}><AppIcon name="settings" size={44} color={semanticColors.primary}/></View>
      <AppText style={styles.title}>{t(defaultLocale,'maintenance.title')}</AppText>
      <AppText style={styles.message}>{t(defaultLocale,'maintenance.message')}</AppText>
      <AppButton label={t(defaultLocale,'action.retry')} icon="refresh" disabled={busy} onPress={()=>void retry()}/>
    </View>
  </Screen>;
}
const styles=StyleSheet.create({content:{flex:1,alignItems:'center',justifyContent:'center',gap:spacing.lg},icon:{width:80,height:80,borderRadius:40,alignItems:'center',justifyContent:'center',backgroundColor:semanticColors.primarySoft},title:{fontSize:26,fontWeight:'900',textAlign:'center'},message:{fontSize:17,lineHeight:26,color:semanticColors.textSecondary,textAlign:'center',maxWidth:420}});
