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
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import { createFamily, joinFamily } from '../../api/families';

const BASE_HEIGHT = 812;
const CODE_LENGTH = 6;

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

function scaleByHeight(screenHeight, minValue, maxValue) {
  const ratio = clamp(
    (screenHeight - 568) / (BASE_HEIGHT - 568),
    0,
    1
  );

  return Math.round(
    minValue + (maxValue - minValue) * ratio
  );
}

export default function CreateFamilyScreen({ navigation }) {
  const { screenPadding, height } = useLayout();

  const [mode, setMode] = useState('create');

  const [familyName, setFamilyName] = useState('');

  const [code, setCode] = useState(
    Array(CODE_LENGTH).fill('')
  );

  const inputRefs = useRef([]);

  const topOffset = scaleByHeight(height, 30, 120);

  const fullCode = code.join('');

  const isCodeComplete =
    fullCode.length === CODE_LENGTH;

  const handleCodeChange = (text, index) => {
    const digit = text
      .replace(/[^0-9A-Za-z]/g, '')
      .toUpperCase();

    if (digit.length <= 1) {
      const newCode = [...code];

      newCode[index] = digit;

      setCode(newCode);

      if (digit && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    if (text.length === CODE_LENGTH) {
      const chars = text
        .replace(/[^0-9A-Za-z]/g, '')
        .toUpperCase()
        .split('')
        .slice(0, CODE_LENGTH);

      const newCode = Array(CODE_LENGTH).fill('');

      chars.forEach((char, i) => {
        newCode[i] = char;
      });

      setCode(newCode);

      inputRefs.current[CODE_LENGTH - 1]?.focus();
    }
  };

  const handleCodeKeyPress = (e, index) => {
    if (
      e.nativeEvent.key === 'Backspace' &&
      !code[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert(
        'Ошибка',
        'Введите название семьи'
      );

      return;
    }

    try {
      await createFamily(familyName.trim());

      navigation.replace('MainTabs');
    } catch (error) {
      const errorData = error.response?.data;

      console.log(
        'Ошибка создания семьи:',
        JSON.stringify(errorData)
      );

      if (errorData?.error) {
        Alert.alert('Ошибка', errorData.error);
      } else {
        Alert.alert(
          'Ошибка',
          'Не удалось создать семейную группу'
        );
      }
    }
  };

  const handleJoinFamily = async () => {
    if (!isCodeComplete) {
      Alert.alert(
        'Ошибка',
        'Введите полный код приглашения'
      );

      return;
    }

    try {
      await joinFamily(fullCode);

      navigation.replace('MainTabs');
    } catch (error) {
      const errorData = error.response?.data;

      console.log(
        'Ошибка входа в семью:',
        JSON.stringify(errorData)
      );

      if (errorData?.error) {
        Alert.alert('Ошибка', errorData.error);
      } else {
        Alert.alert(
          'Ошибка',
          'Не удалось присоединиться к семье'
        );
      }
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: screenPadding,
              paddingTop: topOffset,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.centerBlock}>
            <Text
              style={styles.title}
              allowFontScaling={false}
            >
              Семейная группа
            </Text>

            <Text
              style={styles.description}
              allowFontScaling={false}
            >
              Создайте семейную группу или
              присоединитесь, чтобы пользоваться
              приложением
            </Text>

            <View style={styles.modeButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.modeButton,

                  mode === 'create'
                    ? styles.modeButtonActive
                    : styles.modeButtonInactive,
                ]}
                activeOpacity={0.85}
                onPress={() => setMode('create')}
              >
                <Text
                  style={[
                    styles.modeButtonText,

                    mode === 'create'
                      ? styles.modeButtonTextActive
                      : styles.modeButtonTextInactive,
                  ]}
                  allowFontScaling={false}
                >
                  Создать
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,

                  mode === 'join'
                    ? styles.modeButtonActive
                    : styles.modeButtonInactive,
                ]}
                activeOpacity={0.85}
                onPress={() => setMode('join')}
              >
                <Text
                  style={[
                    styles.modeButtonText,

                    mode === 'join'
                      ? styles.modeButtonTextActive
                      : styles.modeButtonTextInactive,
                  ]}
                  allowFontScaling={false}
                >
                  Присоединиться
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'create' ? (
              <View style={styles.formBlock}>
                <View style={styles.fieldBlock}>
                  <Text
                    style={styles.fieldLabel}
                    allowFontScaling={false}
                  >
                    Название семьи
                  </Text>

                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Ивановы"
                    placeholderTextColor="#CDCDCD"
                    value={familyName}
                    onChangeText={setFamilyName}
                    allowFontScaling={false}
                  />
                </View>

                <View style={styles.photoBlock}>
                  <Text
                    style={styles.fieldLabel}
                    allowFontScaling={false}
                  >
                    Семейная фотография
                  </Text>

                  <TouchableOpacity
                    style={styles.photoUploadField}
                    activeOpacity={0.85}
                    onPress={() => {
                      Alert.alert(
                        'Позже',
                        'Загрузку фотографии подключим позже'
                      );
                    }}
                  >
                    <Text
                      style={styles.photoUploadText}
                      allowFontScaling={false}
                    >
                      Нажмите для загрузки
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  activeOpacity={0.85}
                  onPress={handleCreateFamily}
                >
                  <Text
                    style={styles.primaryButtonText}
                    allowFontScaling={false}
                  >
                    Создать группу
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formBlock}>
                <Text
                  style={styles.codeLabel}
                  allowFontScaling={false}
                >
                  Введите код приглашения
                </Text>

                <View style={styles.codeContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        inputRefs.current[index] =
                          ref;
                      }}
                      style={[
                        styles.codeInput,

                        digit
                          ? styles.codeInputFilled
                          : null,
                      ]}
                      value={digit}
                      onChangeText={(text) =>
                        handleCodeChange(text, index)
                      }
                      onKeyPress={(e) =>
                        handleCodeKeyPress(e, index)
                      }
                      keyboardType="default"
                      maxLength={
                        index === 0
                          ? CODE_LENGTH
                          : 1
                      }
                      allowFontScaling={false}
                      autoCapitalize="characters"
                      selectTextOnFocus
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,

                    !isCodeComplete &&
                      styles.primaryButtonDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={handleJoinFamily}
                  disabled={!isCodeComplete}
                >
                  <Text
                    style={styles.primaryButtonText}
                    allowFontScaling={false}
                  >
                    Присоединиться
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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

  centerBlock: {
    width: '100%',
    alignItems: 'center',
  },

  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.titleL,
    color: '#313131',
    textAlign: 'center',
  },

  description: {
    width: '100%',
    marginTop: 24,
    fontFamily: fontFamily.regular,
    fontSize: 18,
    lineHeight: 24,
    color: '#606060',
    textAlign: 'center',
  },

  modeButtonsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 38,
  },

  modeButton: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modeButtonActive: {
    backgroundColor: '#9456FE',
  },

  modeButtonInactive: {
    backgroundColor: '#E7E7E7',
  },

  modeButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
  },

  modeButtonTextActive: {
    color: '#FFFFFF',
  },

  modeButtonTextInactive: {
    color: '#606060',
  },

  formBlock: {
    width: '100%',
    marginTop: 30,
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

  photoBlock: {
    width: '100%',
    marginTop: 20,
  },

  photoUploadField: {
    width: '100%',
    height: 93,
    borderWidth: 1,
    borderColor: '#CDCDCD',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  photoUploadText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#A4A4A4',
  },

  primaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#9456FE',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },

  primaryButtonDisabled: {
    opacity: 0.5,
  },

  primaryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: '#FFFFFF',
  },

  codeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyL,
    color: '#313131',
    textAlign: 'center',
    marginBottom: 18,
  },

  codeContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});