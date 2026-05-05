import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { confirmPasswordReset } from '../../api/auth';

const BASE_HEIGHT = 812;

const LIMITS = {
  topOffset: { min: 30, max: 150 },
  titleToFirstField: { min: 32, max: 64 },
  fieldGap: { min: 14, max: 20 },
  fieldToButton: { min: 20, max: 30 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function scaleByHeight(screenHeight, minValue, maxValue) {
  const ratio = clamp((screenHeight - 568) / (BASE_HEIGHT - 568), 0, 1);
  return Math.round(minValue + (maxValue - minValue) * ratio);
}

function getMetrics(screenHeight) {
  return {
    topOffset: scaleByHeight(
      screenHeight,
      LIMITS.topOffset.min,
      LIMITS.topOffset.max
    ),
    titleToFirstField: scaleByHeight(
      screenHeight,
      LIMITS.titleToFirstField.min,
      LIMITS.titleToFirstField.max
    ),
    fieldGap: scaleByHeight(
      screenHeight,
      LIMITS.fieldGap.min,
      LIMITS.fieldGap.max
    ),
    fieldToButton: scaleByHeight(
      screenHeight,
      LIMITS.fieldToButton.min,
      LIMITS.fieldToButton.max
    ),
  };
}

export default function ChangePasswordScreen({ navigation, route }) {
  const { screenPadding, height } = useLayout();
  const s = getMetrics(height);

  // Получаем email и code с предыдущего экрана
  const email = route.params?.email || '';
  const code = route.params?.code || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!password.trim()) {
      Alert.alert('Ошибка', 'Введите новый пароль');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 8 символов');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    // Проверяем что email и code переданы
    if (!email || !code) {
      Alert.alert('Ошибка', 'Данные для сброса пароля не найдены. Попробуйте заново.');
      navigation.navigate('ForgotPassword');
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(email, code, password, confirmPassword);

      Alert.alert(
        'Пароль изменён',
        'Теперь вы можете войти с новым паролем',
        [
          {
            text: 'Войти',
            onPress: () => navigation.replace('Login'),
          },
        ]
      );
    } catch (error) {
      const errorData = error.response?.data;
      console.log('Ошибка смены пароля:', JSON.stringify(errorData));

      if (errorData?.error) {
        Alert.alert('Ошибка', errorData.error);
      } else {
        Alert.alert('Ошибка', 'Не удалось изменить пароль');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: screenPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Заголовок */}
          <View style={[styles.titleContainer, { marginTop: s.topOffset }]}>
            <Text style={styles.title} allowFontScaling={false}>
              Смена пароля
            </Text>
          </View>

          {/* Поля ввода */}
          <View style={{ marginTop: s.titleToFirstField }}>

            {/* Новый пароль */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel} allowFontScaling={false}>
                Новый пароль
              </Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="1a2b3c..."
                placeholderTextColor="#CDCDCD"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                autoCapitalize="none"
                allowFontScaling={false}
                editable={!loading}
              />
            </View>

            {/* Подтверждение пароля */}
            <View style={[styles.fieldBlock, { marginTop: s.fieldGap }]}>
              <Text style={styles.fieldLabel} allowFontScaling={false}>
                Подтвердите пароль
              </Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="1a2b3c..."
                placeholderTextColor="#CDCDCD"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={true}
                autoCapitalize="none"
                allowFontScaling={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Кнопки */}
          <View style={{ marginTop: s.fieldToButton }}>

            {/* Сохранить пароль */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                loading && styles.primaryButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText} allowFontScaling={false}>
                  Сохранить пароль
                </Text>
              )}
            </TouchableOpacity>

            {/* Назад */}
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText} allowFontScaling={false}>
                Назад
              </Text>
            </TouchableOpacity>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  flex: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  titleContainer: {
    width: '100%',
    alignItems: 'center',
  },

  title: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#313131',
    textAlign: 'center',
  },

  fieldBlock: {
    width: '100%',
  },

  fieldLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyL,
    color: '#313131',
    marginBottom: 8,
    paddingLeft: 8,
  },

  fieldInput: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: '#CDCDCD',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: '#313131',
  },

  primaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#9456FE',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryButtonDisabled: {
    opacity: 0.7,
  },

  primaryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: '#FFFFFF',
  },

  secondaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,

    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },

  secondaryButtonText: {
    fontFamily: fontFamily.regular,
    fontSize: 20,
    color: '#3D3C3C',
  },
});