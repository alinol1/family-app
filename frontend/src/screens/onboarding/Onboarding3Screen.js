import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppButton from '../../components/AppButton';
import { colors } from '../../utils/colors';

export default function Onboarding3Screen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Быстрая помощь в нужный момент</Text>
        <Text style={styles.subtitle}>
          Если случится экстренная ситуация, SOS-сигнал мгновенно отправит уведомление близким.
        </Text>
      </View>

      <View style={styles.bottom}>
        <AppButton
          title="Начать"
          onPress={() => navigation.replace('Login')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 80,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
    marginTop: 80,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  bottom: {
    alignItems: 'center',
  },
});