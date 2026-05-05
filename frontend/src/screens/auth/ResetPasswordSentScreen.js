import React, { useState, useRef } from 'react';
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
import { verifyPasswordResetCode } from '../../api/auth';

const BASE_HEIGHT = 812;
const CODE_LENGTH = 6;

const LIMITS = {
  topOffset: { min: 30, max: 150 },
  titleToDescription: { min: 20, max: 40 },
  descriptionToCode: { min: 24, max: 48 },
  codeToButton: { min: 24, max: 40 },
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
    titleToDescription: scaleByHeight(
      screenHeight,
      LIMITS.titleToDescription.min,
      LIMITS.titleToDescription.max
    ),
    descriptionToCode: scaleByHeight(
      screenHeight,
      LIMITS.descriptionToCode.min,
      LIMITS.descriptionToCode.max
    ),
    codeToButton: scaleByHeight(
      screenHeight,
      LIMITS.codeToButton.min,
      LIMITS.codeToButton.max
    ),
  };
}

export default function ResetPasswordSentScreen({ navigation, route }) {
  const { screenPadding, height } = useLayout();
  const s = getMetrics(height);

  const email = route.params?.email || '';

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef([]);

  const fullCode = code.join('');
  const isCodeComplete = fullCode.length === CODE_LENGTH;

  const handleChange = (text, index) => {
    // Разрешаем только цифры
    const digit = text.replace(/[^0-9]/g, '');

    if (digit.length <= 1) {
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      // Автопереход к следующему полю
      if (digit && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    // Если вставили сразу весь код (например из буфера обмена)
    if (text.length === CODE_LENGTH) {
      const digits = text.replace(/[^0-9]/g, '').split('').slice(0, CODE_LENGTH);
      setCode(digits);
      inputRefs.current[CODE_LENGTH - 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // При нажатии Backspace переходим на предыдущее поле
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!isCodeComplete) {
      Alert.alert('Ошибка', 'Введите полный код');
      return;
    }

    setLoading(true);

    try {
      await verifyPasswordResetCode(email, fullCode);

      navigation.navigate('ChangePassword', {
        email,
        code: fullCode,
      });
    } catch (error) {
      const errorData = error.response?.data;
      console.log('Ошибка проверки кода:', JSON.stringify(errorData));

      if (errorData?.error) {
        Alert.alert('Ошибка', errorData.error);
      } else {
        Alert.alert('Ошибка', 'Неверный или просроченный код');
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

          {/* Описание */}
          <Text
            style={[styles.description, { marginTop: s.titleToDescription }]}
            allowFontScaling={false}
          >
            На Вашу почту отправлено письмо{'\n'}для сброса пароля
          </Text>

          {/* Поля ввода кода */}
          <View style={[styles.codeContainer, { marginTop: s.descriptionToCode }]}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : null,
                ]}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? CODE_LENGTH : 1}
                allowFontScaling={false}
                editable={!loading}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Подпись */}
          <Text style={styles.codeHint} allowFontScaling={false}>
            Вставьте код
          </Text>

          {/* Кнопка Восстановить */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { marginTop: s.codeToButton },
              (!isCodeComplete || loading) && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleVerify}
            disabled={!isCodeComplete || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText} allowFontScaling={false}>
                Восстановить
              </Text>
            )}
          </TouchableOpacity>

          {/* Кнопка Назад */}
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

  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyL,
    color: '#313131',
    textAlign: 'center',
    paddingLeft: 6,
  },

  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: '#CDCDCD',
    borderRadius: 16,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: '#313131',
  },

  codeInputFilled: {
    borderColor: '#9456FE',
  },

  codeHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyS,
    color: '#CDCDCD',
    textAlign: 'center',
    marginTop: 12,
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
    opacity: 0.5,
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
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: '#3D3C3C',
  },
});