import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppButton from '../../components/AppButton';
import { colors } from '../../utils/colors';

export default function ResetPasswordSentScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Письмо отправлено</Text>
      <Text style={styles.subtitle}>
        На вашу почту отправлено письмо для сброса пароля.
      </Text>

      <View style={styles.buttons}>
        <AppButton
          title="Продолжить"
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
  },
});