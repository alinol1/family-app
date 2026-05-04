import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { fontFamily } from '../../utils/fonts';
import { layout } from '../../utils/layout';
import { useLayout } from '../../utils/useLayout';

// Базовая высота макета (iPhone 13 / 375×812)
const BASE_HEIGHT = 812;

// Базовые значения для стандартного экрана
const BASE = {
  titleSize: 48,
  titleLineHeight: 58,
  subtitleSize: 22,
  subtitleLineHeight: 28,
  topPadding: 69,
  illustrationToTitle: 32,
  titleToSubtitle: 30,
  textToButtons: 64,
  buttonTextSize: 18,
  iconSize: 20,
};

// Минимумы и максимумы
const LIMITS = {
  titleSize: { min: 36, max: 48 },
  titleLineHeight: { min: 43, max: 58 },
  subtitleSize: { min: 16, max: 22 },
  subtitleLineHeight: { min: 22, max: 28 },
  buttonTextSize: { min: 16, max: 18 },
  iconSize: { min: 18, max: 20 },
  topPadding: { min: 24, max: 69 },
  illustrationToTitle: { min: 12, max: 32 },
  titleToSubtitle: { min: 12, max: 30 },
  textToButtons: { min: 24, max: 64 },
};

const TITLE_LINES_ESTIMATE = 2;
const BUTTON_GAP = 8;
const SAFE_AREA_RESERVE = 80;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function scaleByHeight(screenHeight, minValue, maxValue) {
  const ratio = clamp((screenHeight - 568) / (BASE_HEIGHT - 568), 0, 1);
  return Math.round(minValue + (maxValue - minValue) * ratio);
}

function getAdaptiveMetrics(screenHeight) {
  return {
    titleSize: scaleByHeight(
      screenHeight,
      LIMITS.titleSize.min,
      LIMITS.titleSize.max
    ),
    titleLineHeight: scaleByHeight(
      screenHeight,
      LIMITS.titleLineHeight.min,
      LIMITS.titleLineHeight.max
    ),
    subtitleSize: scaleByHeight(
      screenHeight,
      LIMITS.subtitleSize.min,
      LIMITS.subtitleSize.max
    ),
    subtitleLineHeight: scaleByHeight(
      screenHeight,
      LIMITS.subtitleLineHeight.min,
      LIMITS.subtitleLineHeight.max
    ),
    topPadding: scaleByHeight(
      screenHeight,
      LIMITS.topPadding.min,
      LIMITS.topPadding.max
    ),
    illustrationToTitle: scaleByHeight(
      screenHeight,
      LIMITS.illustrationToTitle.min,
      LIMITS.illustrationToTitle.max
    ),
    titleToSubtitle: scaleByHeight(
      screenHeight,
      LIMITS.titleToSubtitle.min,
      LIMITS.titleToSubtitle.max
    ),
    textToButtons: scaleByHeight(
      screenHeight,
      LIMITS.textToButtons.min,
      LIMITS.textToButtons.max
    ),
    buttonTextSize: scaleByHeight(
      screenHeight,
      LIMITS.buttonTextSize.min,
      LIMITS.buttonTextSize.max
    ),
    iconSize: scaleByHeight(
      screenHeight,
      LIMITS.iconSize.min,
      LIMITS.iconSize.max
    ),
  };
}

export default function Onboarding1Screen({ navigation }) {
  const {
    screenPadding,
    isSmall,
    contentMaxWidth,
    height,
  } = useLayout();

  const s = getAdaptiveMetrics(height);

  const reservedSpace =
    s.topPadding +
    s.illustrationToTitle +
    s.titleLineHeight * TITLE_LINES_ESTIMATE +
    s.titleToSubtitle +
    s.subtitleLineHeight +
    s.textToButtons +
    layout.buttonHeight * 2 +
    BUTTON_GAP +
    SAFE_AREA_RESERVE;

  const illustrationMaxHeight = Math.max(150, height - reservedSpace);

  const illustrationStyle = {
    width: isSmall ? '90%' : '100%',
    maxHeight: illustrationMaxHeight,
    alignSelf: 'center',
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
        <View
          style={[
            styles.inner,
            contentMaxWidth ? { maxWidth: contentMaxWidth } : null,
          ]}
        >
          <View style={styles.topContent}>
            <Image
              source={require('../../../assets/images/onboarding-1.png')}
              style={[styles.illustration, illustrationStyle]}
              resizeMode="contain"
            />

            <View
              style={[
                styles.textBlock,
                { marginTop: s.illustrationToTitle },
              ]}
            >
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: s.titleSize,
                    lineHeight: s.titleLineHeight,
                  },
                ]}
                allowFontScaling={false}
              >
                Вся семья —{'\n'}в одном месте
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    marginTop: s.titleToSubtitle,
                    fontSize: s.subtitleSize,
                    lineHeight: s.subtitleLineHeight,
                  },
                ]}
                allowFontScaling={false}
              >
                Общайтесь, делитесь важным и оставайтесь рядом каждый день
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.buttonsContainer,
              { marginTop: s.textToButtons },
            ]}
          >
            <TouchableOpacity
              style={styles.loginButton}
              activeOpacity={0.85}
              onPress={() => navigation.replace('Login')}
            >
              <Text
                style={[
                  styles.loginButtonText,
                  { fontSize: s.buttonTextSize },
                ]}
                allowFontScaling={false}
              >
                Войти
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Onboarding2')}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  { fontSize: s.buttonTextSize },
                ]}
                allowFontScaling={false}
              >
                Продолжить
              </Text>

              <Ionicons
                name="arrow-forward"
                size={s.iconSize}
                color="#9452FE"
                style={styles.continueButtonIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#9452FE',
  },

  container: {
    flex: 1,
    backgroundColor: '#9452FE',
  },

  inner: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-between',
  },

  topContent: {
    flex: 1,
    justifyContent: 'center',
  },

  illustration: {
    width: '100%',
  },

  textBlock: {
    width: '100%',
    paddingHorizontal: 4,
  },

  title: {
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
    textAlign: 'left',
  },

  subtitle: {
    fontFamily: fontFamily.regular,
    color: '#FFFFFF',
    textAlign: 'left',
  },

  buttonsContainer: {
    width: '100%',
    paddingBottom: 8,
  },

  loginButton: {
    width: '100%',
    height: layout.buttonHeight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: BUTTON_GAP,
  },

  loginButtonText: {
    fontFamily: fontFamily.medium,
    color: '#FFFFFF',
  },

  continueButton: {
    width: '100%',
    height: layout.buttonHeight,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  continueButtonText: {
    fontFamily: fontFamily.medium,
    color: '#9452FE',
  },

  continueButtonIcon: {
    position: 'absolute',
    right: 18,
  },
});