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
import { register, login } from '../../api/auth';

const BASE_HEIGHT = 812;

const LIMITS = {
  topOffset: { min: 1, max: 120 },
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

export default function RegisterScreen({ navigation }) {
  const { screenPadding, height } = useLayout();
  const s = getMetrics(height);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Ошибка', 'Введите почту');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Ошибка', 'Введите пароль');
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

    setLoading(true);

    try {
      await register({
        username: email.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        first_name: name.trim(),
        last_name: '',
        password: password,
        password2: confirmPassword,
      });

      await login(email.trim().toLowerCase(), password);

      navigation.replace('FamilyChoice');
    } catch (error) {
      const errorData = error.response?.data;
      console.log('Ошибка регистрации:', JSON.stringify(errorData));

      if (errorData) {
        const messages = Object.values(errorData).flat().join('\n');
        Alert.alert('Ошибка регистрации', messages);
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
              Регистрация
            </Text>
          </View>

          {/* Поля ввода */}
          <View style={{ marginTop: s.titleToFirstField }}>

            {/* Имя */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel} allowFontScaling={false}>
                Имя
              </Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Иван"
                placeholderTextColor="#CDCDCD"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                allowFontScaling={false}
                editable={!loading}
              />
            </View>

            {/* Почта */}
            <View style={[styles.fieldBlock, { marginTop: s.fieldGap }]}>
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

          {/* Кнопка */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              { marginTop: s.fieldToButton },
              loading && styles.registerButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.registerButtonText} allowFontScaling={false}>
                Зарегистрироваться
              </Text>
            )}
          </TouchableOpacity>

          {/* Ссылка */}
          <View style={styles.linkContainer}>
            <Text style={styles.linkText} allowFontScaling={false}>
              Есть аккаунт?{' '}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.replace('Login')}
              disabled={loading}
            >
              <Text style={styles.linkAction} allowFontScaling={false}>
                Вход
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

  registerButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#9456FE',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  registerButtonDisabled: {
    opacity: 0.7,
  },

  registerButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: '#FFFFFF',
  },

  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
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