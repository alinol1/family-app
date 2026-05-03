import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <Image
          source={require('../../assets/images/splash-illustration.png')}
          style={styles.illustration}
          resizeMode="contain"
        />

        <Text style={styles.title}>маяк</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#9452FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: 246,
    height: 239,
  },
  title: {
    marginTop: 30,
    fontSize: 80,
    color: '#FFFFFF',
    fontFamily: 'SoyuzGrotesk',
  },
});