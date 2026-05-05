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
import { requestPasswordReset } from '../../api/auth';

const BASE_HEIGHT = 812;

const LIMITS = {
  topOffset: { min: 30, max: 150 },
  titleToFirstField: { min: 32, max: 64 },
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
    fieldToButton: scaleByHeight(
      screenHeight,
      LIMITS.fieldToButton.min,
      LIMITS.fieldToButton.max
    ),
  };
}

export default function ForgotPasswordScreen({ navigation }) {
  const { screenPadding, height } = useLayout();
  const s = getMetrics(height);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Ошибка', 'Введите почту');
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(email.trim().toLowerCase());

      // Переходим на экран ввода кода и передаём email
      navigation.navigate('ResetPasswordSent', {
        email: email.trim().toLowerCase(),
      });
    } catch (error) {
      const errorData = error.response?.data;
      console.log('Ошибка отправки кода:', JSON.stringify(errorData));

      if (errorData?.error) {
        Alert.alert('Ошибка', errorData.error);
      } else {
        Alert.alert('Ошибка', 'Не удалось отправить письмо');
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
              Восстановление пароля
            </Text>
          </View>

          {/* Поле ввода */}
          <View style={{ marginTop: s.titleToFirstField }}>
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

              <Text style={styles.fieldHint} allowFontScaling={false}>
                Отправим вам сообщение для сброса пароля
              </Text>
            </View>
          </View>

          {/* Кнопки */}
          <View style={{ marginTop: s.fieldToButton }}>
            {/* Отправить */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                loading && styles.sendButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sendButtonText} allowFontScaling={false}>
                  Отправить
                </Text>
              )}
            </TouchableOpacity>

            {/* Назад */}
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.backButtonText} allowFontScaling={false}>
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

  fieldHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyS,
    color: '#313131',
    marginTop: 8,
    paddingLeft: 8,
  },

  sendButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#9456FE',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sendButtonDisabled: {
    opacity: 0.7,
  },

  sendButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: '#FFFFFF',
  },

  backButton: {
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

  backButtonText: {
    fontFamily: fontFamily.regular,
    fontSize: 20,
    color: '#3D3C3C',
  },
});