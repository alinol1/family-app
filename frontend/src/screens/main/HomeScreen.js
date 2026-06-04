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
import CachedAvatar from '../../components/CachedAvatar';

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
      let isActive = true;

      const loadProfile = async () => {
        try {
          const profile = await getProfile();

          if (!isActive) return;

          const nextName = profile.first_name || 'Пользователь';
          const nextAvatar = profile.avatar_url || profile.avatar || null;

          setUserName((prev) =>
            prev !== nextName ? nextName : prev
          );

          setUserAvatar((prev) =>
            prev !== nextAvatar ? nextAvatar : prev
          );
        } catch (error) {
          console.log('Ошибка загрузки профиля:', error);
        }
      };

      loadProfile();

      return () => {
        isActive = false;
      };
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
      illustration: require('../../../assets/images/file3.png'),
    },
    {
      name: 'Финансы',
      color: '#E6E6E6',
      icon: 'wallet-outline',
      screen: 'Finance',
      textColor: '#262626',
      iconColor: '#AAAAAA',
      borderColor: '#E6E6E6',
      illustration: require('../../../assets/images/mon03.png'),
    },
    {
      name: 'Фотографии',
      color: '#E96847',
      icon: 'camera-outline',
      screen: 'Photos',
      textColor: '#FFFFFF',
      iconColor: '#E96847',
      borderColor: '#E96847',
      illustration: require('../../../assets/images/phot03.png'),
    },
    {
      name: 'Семейное древо',
      color: '#E6E6E6',
      icon: 'people-outline',
      screen: 'FamilyTree',
      textColor: '#262626',
      iconColor: '#AAAAAA',
      borderColor: '#E6E6E6',
      illustration: require('../../../assets/images/tree03.png'),
    },
  ];

  const renderModuleCard = (module, index) => (
    <TouchableOpacity
      key={index}
      style={[styles.card, { backgroundColor: module.color }]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate(module.screen)}
    >
      <Image
        source={module.illustration}
        style={styles.cardIllustration}
        resizeMode="contain"
      />

      <View style={styles.cardTop}>
        <View style={styles.cardIconCircle}>
          <Ionicons name={module.icon} size={22} color={module.iconColor} />
        </View>
      </View>

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
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.welcomePill}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Профиль')}
          >
            <View style={styles.avatarContainer}>
              <CachedAvatar
                uri={userAvatar}
                size={AVATAR_SIZE}
                backgroundColor="#C39EFF"
                icon="person"
                iconSize={27}
                iconColor="#FFFFFF"
              />
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
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={28} color="#7B7B7B" />
          </TouchableOpacity>
        </View>

        <Text style={styles.screenTitle} allowFontScaling={false}>
          Главная
        </Text>

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

  screenTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#262626',
    marginTop: 18,
    paddingLeft: 2,
  },

  scrollArea: {
    flex: 1,
    marginTop: 25,
  },

  scrollContent: {
    gap: 10,
    paddingBottom: 120,
  },

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
  },

  arrowPill: {
    width: ARROW_PILL_WIDTH,
    height: ARROW_PILL_HEIGHT,
    borderRadius: ARROW_PILL_HEIGHT,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardIllustration: {
    position: 'absolute',
    right: 1,
    bottom: 16,
    width: 150,
    height: 110,
  },
});