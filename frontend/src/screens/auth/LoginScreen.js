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
import { layout } from '../../utils/layout';
import { useLayout } from '../../utils/useLayout';
import { login } from '../../api/auth';

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

export default function LoginScreen({ navigation }) {
  const { screenPadding, height } = useLayout();
  const s = getMetrics(height);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Ошибка', 'Введите почту');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Ошибка', 'Введите пароль');
      return;
    }

    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
      navigation.replace('MainTabs');
    } catch (error) {
      const errorData = error.response?.data;
      console.log('Ошибка входа:', JSON.stringify(errorData));

      if (error.response?.status === 401) {
        Alert.alert('Ошибка', 'Неверная почта или пароль');
      } else if (errorData) {
        const messages = Object.values(errorData).flat().join('\n');
        Alert.alert('Ошибка входа', messages);
      } else {
        Alert.alert('Ошибка', 'Не удалось подключиться к серверу');
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
              Вход
            </Text>
          </View>

          {/* Поля ввода */}
          <View style={{ marginTop: s.titleToFirstField }}>

            {/* Почта */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel} allowFontScaling={false}>
                Почта
              </Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="mayak@yandex.ru"
                placeholderTextColor="#CDCDCD"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                allowFontScaling={false}
                editable={!loading}
              />
            </View>

            {/* Пароль */}
            <View style={[styles.fieldBlock, { marginTop: s.fieldGap }]}>
              <Text style={styles.fieldLabel} allowFontScaling={false}>
                Пароль
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
          </View>

          {/* Кнопка Войти */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              { marginTop: s.fieldToButton },
              loading && styles.loginButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText} allowFontScaling={false}>
                Войти
              </Text>
            )}
          </TouchableOpacity>

          {/* Забыли пароль */}
          <TouchableOpacity
            style={styles.forgotContainer}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}
          >
            <Text style={styles.forgotText} allowFontScaling={false}>
              Забыли пароль?
            </Text>
          </TouchableOpacity>

        </ScrollView>

        {/* Нет аккаунта — прижато к низу */}
        <View style={[styles.linkContainer, { paddingHorizontal: screenPadding }]}>
          <Text style={styles.linkText} allowFontScaling={false}>
            Нет аккаунта?{' '}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.replace('Register')}
            disabled={loading}
          >
            <Text style={styles.linkAction} allowFontScaling={false}>
              Зарегистрироваться
            </Text>
          </TouchableOpacity>
        </View>

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

  loginButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#9456FE',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: '#FFFFFF',
  },

  forgotContainer: {
    alignItems: 'center',
    marginTop: 16,
  },

  forgotText: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: '#9456FE',
  },

  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },

  linkText: {
    fontFamily: fontFamily.regular,
    fontSize: 18,
    color: '#313131',
  },

  linkAction: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: '#9456FE',
  },
});