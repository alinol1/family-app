import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { getProfile } from '../../api/auth';

const AVATAR_SIZE = 60;
const PILL_HEIGHT = 60;
const PILL_RADIUS = 30;
const PILL_WIDTH = 214;
const SETTINGS_BUTTON_SIZE = AVATAR_SIZE;

const CARD_HEIGHT = 135;
const CARD_RADIUS = 25;
const CARD_ICON_CIRCLE = 44;
const ARROW_PILL_WIDTH = 88;
const ARROW_PILL_HEIGHT = 34;

export default function HomeScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [userName, setUserName] = useState('Пользователь');
  const [userAvatar, setUserAvatar] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        try {
          const profile = await getProfile();
          setUserName(profile.first_name || 'Пользователь');
          setUserAvatar(profile.avatar || null);
        } catch (error) {
          console.log('Ошибка загрузки профиля:', error);
        }
      };

      loadProfile();
    }, [])
  );

  const modules = [
    {
      name: 'Документы',
      color: '#9452FE',
      icon: 'folder-outline',
      screen: 'Documents',
      textColor: '#FFFFFF',
      iconColor: '#9452FE',
      borderColor: '#9452FE',
      illustration: require('../../../assets/images/card-documents.png'),
    },
    {
      name: 'Финансы',
      color: '#E6E6E6',
      icon: 'wallet-outline',
      screen: 'Finance',
      textColor: '#262626',
      iconColor: '#AAAAAA',
      borderColor: '#E6E6E6',
      illustration: require('../../../assets/images/card-finance.png'),
    },
    {
      name: 'Фотографии',
      color: '#E96847',
      icon: 'camera-outline',
      screen: 'Photos',
      textColor: '#FFFFFF',
      iconColor: '#E96847',
      borderColor: '#E96847',
      illustration: require('../../../assets/images/card-photos.png'),
    },
    {
      name: 'Семейное древо',
      color: '#E6E6E6',
      icon: 'people-outline',
      screen: 'FamilyTree',
      textColor: '#262626',
      iconColor: '#AAAAAA',
      borderColor: '#E6E6E6',
      illustration: require('../../../assets/images/card-tree.png'),
    },
  ];

  const renderModuleCard = (module, index) => (
    <TouchableOpacity
      key={index}
      style={[styles.card, { backgroundColor: module.color }]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate(module.screen)}
    >
      {/* Иллюстрация справа */}
      <Image
        source={module.illustration}
        style={styles.cardIllustration}
        resizeMode="contain"
      />

      {/* Верхняя часть — иконка */}
      <View style={styles.cardTop}>
        <View style={styles.cardIconCircle}>
          <Ionicons name={module.icon} size={22} color={module.iconColor} />
        </View>
      </View>

      {/* Нижняя часть — название + стрелка */}
      <View style={styles.cardBottom}>
        <Text style={[styles.cardTitle, { color: module.textColor }]} allowFontScaling={false}>
          {module.name}
        </Text>

        <View style={[styles.arrowPill, { borderColor: module.borderColor }]}>
          <Ionicons name="arrow-forward" size={16} color="#858585" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>

        {/* Статичный верхний блок */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.welcomePill}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Профиль')}
          >
            <View style={styles.avatarContainer}>
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText} allowFontScaling={false}>
                    {userName ? userName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.welcomeTextBlock}>
              <Text style={styles.welcomeLabel} allowFontScaling={false}>
                Добро пожаловать,
              </Text>
              <Text style={styles.welcomeName} allowFontScaling={false}>
                {userName}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={28} color="#7B7B7B" />
          </TouchableOpacity>
        </View>

        {/* Статичный заголовок */}
        <Text style={styles.screenTitle} allowFontScaling={false}>
          Главная
        </Text>

        {/* Скроллящийся контент */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {modules.map((module, index) => renderModuleCard(module, index))}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Верхний блок
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    marginTop: 8,
  },

  welcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: '#F7F7F7',
  },

  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
  },

  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },

  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#C39EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarPlaceholderText: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: '#FFFFFF',
  },

  welcomeTextBlock: {
    marginLeft: 8,
    justifyContent: 'center',
  },

  welcomeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyS,
    color: '#A4A4A4',
  },

  welcomeName: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#2E2E2E',
  },

  settingsButton: {
    width: SETTINGS_BUTTON_SIZE,
    height: SETTINGS_BUTTON_SIZE,
    borderRadius: SETTINGS_BUTTON_SIZE / 2,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Заголовок
  screenTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#262626',
    marginTop: 18,
    paddingLeft: 2,
  },

  // Скролл
  scrollArea: {
    flex: 1,
    marginTop: 25,
  },

  scrollContent: {
    gap: 10,
    paddingBottom: 120,
  },

  // Карточка модуля
  card: {
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    padding: 16,
    justifyContent: 'space-between',
  },

  cardTop: {
    alignItems: 'flex-start',
  },

  cardIconCircle: {
    width: CARD_ICON_CIRCLE,
    height: CARD_ICON_CIRCLE,
    borderRadius: CARD_ICON_CIRCLE / 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  cardTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    // color задаётся динамически
  },

  arrowPill: {
    width: ARROW_PILL_WIDTH,
    height: ARROW_PILL_HEIGHT,
    borderRadius: ARROW_PILL_HEIGHT,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    // borderColor задаётся динамически под цвет плашки
  },

  cardIllustration: {
  position: 'absolute',
  right: 16,
  bottom: 16,
  width: 150,
  height: 110,
},
});