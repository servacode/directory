import React from 'react';import { SafeAreaView, StyleSheet, View, type ViewProps } from 'react-native';import { semanticColors, spacing } from '@health/design-tokens';
export function Screen({children,style,...props}:ViewProps){return <SafeAreaView style={styles.safe}><View {...props} style={[styles.body,style]}>{children}</View></SafeAreaView>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:semanticColors.appBackground},body:{flex:1,padding:spacing.lg}});
