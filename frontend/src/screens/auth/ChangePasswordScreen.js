import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppButton from '../../components/AppButton';
import { colors } from '../../utils/colors';

export default function ChangePasswordScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Смена пароля</Text>
      <Text style={styles.subtitle}>
        Экран ввода нового пароля
      </Text>

      <View style={styles.buttons}>
        <AppButton
          title="Сохранить пароль"
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
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
  },
});