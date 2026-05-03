import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Маяк</Text>
      <Text style={styles.subtitle}>Семейное приложение</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textOnPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
});