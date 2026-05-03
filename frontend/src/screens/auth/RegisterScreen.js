import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppButton from '../../components/AppButton';
import { colors } from '../../utils/colors';

export default function RegisterScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Регистрация</Text>
      <Text style={styles.subtitle}>Экран регистрации</Text>

      <View style={styles.buttons}>
        <AppButton
          title="Зарегистрироваться"
          onPress={() => navigation.navigate('FamilyChoice')}
        />
      </View>

      <TouchableOpacity
        style={styles.linkWrapper}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.link}>Уже есть аккаунт? Войти</Text>
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
  linkWrapper: {
    marginTop: 20,
  },
  link: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});