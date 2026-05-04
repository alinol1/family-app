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

// Базовые значения именно для второго онбординга
const BASE = {
  titleSize: 44,
  titleLineHeight: 50,
  subtitleSize: 20,
  subtitleLineHeight: 26,
  topPadding: 69,
  illustrationToTitle: 32,
  titleToSubtitle: 30,
  textToButtons: 64,
  buttonTextSize: 18,
  iconSize: 20,
};

// Минимумы и максимумы
const LIMITS = {
  titleSize: { min: 34, max: 44 },
  titleLineHeight: { min: 40, max: 50 },
  subtitleSize: { min: 15, max: 20 },
  subtitleLineHeight: { min: 21, max: 26 },
  buttonTextSize: { min: 16, max: 18 },
  iconSize: { min: 18, max: 20 },
  topPadding: { min: 24, max: 69 },
  illustrationToTitle: { min: 12, max: 32 },
  titleToSubtitle: { min: 12, max: 30 },
  textToButtons: { min: 24, max: 64 },
};

const TITLE_LINES_ESTIMATE = 2;
const SUBTITLE_LINES_ESTIMATE = 3;
const SAFE_AREA_RESERVE = 72;

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

export default function Onboarding2Screen({ navigation }) {
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
    s.subtitleLineHeight * SUBTITLE_LINES_ESTIMATE +
    s.textToButtons +
    layout.buttonHeight +
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
                Быстрая помощь{'\n'}в нужный момент
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
                Если случится экстренная ситуация,{'\n'}
                SOS-сигнал мгновенно отправит уведомление близким
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
              style={styles.continueButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Onboarding3')}
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
                color="#E85D3B"
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
    backgroundColor: '#E85D3B',
  },

  container: {
    flex: 1,
    backgroundColor: '#E85D3B',
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
    color: '#E85D3B',
  },

  continueButtonIcon: {
    position: 'absolute',
    right: 18,
  },
});