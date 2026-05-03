import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppButton from '../../components/AppButton';
import { colors } from '../../utils/colors';

export default function LoginScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход</Text>
      <Text style={styles.subtitle}>Экран входа</Text>

      <View style={styles.buttons}>
        <AppButton
          title="Войти"
          onPress={() => navigation.navigate('FamilyChoice')}
        />

        <View style={{ height: 12 }} />

        <AppButton
          title="Регистрация"
          outlined
          onPress={() => navigation.navigate('Register')}
        />
      </View>

      <TouchableOpacity
        style={styles.forgotWrapper}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={styles.link}>Забыли пароль?</Text>
      </TouchableOpacity>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
  },
  forgotWrapper: {
    marginTop: 20,
  },
  link: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});