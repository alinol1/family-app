import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily, fontSize } from '../../utils/fonts';
import { scale, verticalScale, moderateScale } from '../../utils/scale';

export default function Onboarding1Screen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../../assets/images/onboarding-1.png')}
          style={styles.illustration}
          resizeMode="contain"
        />

        <View style={styles.textBlock}>
          <Text style={styles.title}>
            Вся семья —{'\n'}в одном месте
          </Text>

          <Text style={styles.subtitle}>
            Общайтесь, делитесь важным и оставайтесь рядом каждый день
          </Text>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.replace('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>Войти</Text>
        </TouchableOpacity>

        <TouchableOpacity
        style={styles.continueButton}
        onPress={() => navigation.navigate('Onboarding2')}
        activeOpacity={0.8}
        >
        <Text style={styles.continueButtonText}>Продолжить</Text>

        <Ionicons
            name="arrow-forward"
            size={20}
            color="#9452FE"
            style={styles.continueButtonIcon}
        />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#9452FE',
    paddingTop: 41,
    paddingHorizontal: 16, // Вот наш отступ для ВСЕХ элементов на экране
    paddingBottom: 40,
    justifyContent: 'space-between',
  },

  content: {
    alignItems: 'center',
    width: '100%', // Важно: блок контента на всю доступную ширину
  },

  illustration: {
    width: scale(343),
    height: verticalScale(358),
    maxWidth: 343, // Но не больше 343px (чтобы на планшетах не стала гигантской)
    height: 358,
  },


  textBlock: {
    width: '100%', // Текст тоже на всю ширину
    marginTop: 30,
  },

    title: {
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(40),
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: moderateScale(47),
    },

    subtitle: {
    marginTop: verticalScale(18),
    fontFamily: fontFamily.regular,
    fontSize: moderateScale(20),
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: moderateScale(24),
    },

  buttonsContainer: {
    width: '100%', // Блок кнопок на всю ширину
    alignItems: 'center',
  },

  loginButton: {
    width: '100%', // Кнопка растянется на 100% доступной ширины
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },

  loginButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: '#FFFFFF',
  },

  continueButton: {
    width: '100%', // Эта кнопка тоже 100%
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

    continueButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    },

    continueButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: '#9452FE',
    },

    continueButtonIcon: {
    position: 'absolute',
    right: 18,
},
});