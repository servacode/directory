import React from'react';import{StyleSheet,View}from'react-native';import{spacing}from'@health/design-tokens';import{AppText}from'./AppText.js';
export function SectionTitle({title,action}:{title:string;action?:React.ReactNode}){return <View style={styles.row}><AppText style={styles.title}>{title}</AppText>{action}</View>}
const styles=StyleSheet.create({row:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',gap:spacing.md},title:{fontSize:20,fontWeight:'800'}});
