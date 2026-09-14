import React from 'react';import { Text, type TextProps, type TextStyle } from 'react-native';import { semanticColors, typography } from '@health/design-tokens';
export function AppText({style,...props}:TextProps){const base:TextStyle={fontFamily:typography.fontFamilyArabic,color:semanticColors.textPrimary,textAlign:'right'};return <Text {...props} style={[base,style]}/>}
