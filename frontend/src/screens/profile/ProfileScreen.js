import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { getProfile } from '../../api/profile';
import { getMyFamily } from '../../api/family';
import CachedAvatar from '../../components/CachedAvatar';

import * as ImagePicker from 'expo-image-picker';
import { uploadProfileAvatar } from '../../api/auth';

import { logout as logoutApi, deleteAccount } from '../../api/auth';

export default function ProfileScreen({ navigation }) {
  const { screenPadding } = useLayout();
  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [family, setFamily] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    try {
      if (!silent && !hasLoadedRef.current) {
        setLoading(true);
      }

      const profileData = await getProfile();

      setProfile(profileData);
      setAvatarUrl(profileData.avatar_url || profileData.avatar || null);

      try {
        const familyData = await getMyFamily();
        setFamily(familyData);
      } catch (familyError) {
        console.log('Пользователь не состоит в семье или семья не загружена');
        setFamily(null);
      }

      hasLoadedRef.current = true;
    } catch (error) {
      console.log('Ошибка загрузки профиля:', error);

      if (!hasLoadedRef.current) {
        Alert.alert('Ошибка', 'Не удалось загрузить профиль');
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData({
        silent: hasLoadedRef.current,
      });
    }, [loadData])
  );

  const logout = () => {
    Alert.alert(
      'Выйти из аккаунта?',
      'После выхода нужно будет снова авторизоваться.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutApi();
            } catch (error) {
              console.log('Ошибка выхода:', error.response?.data || error);
            } finally {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        },
      ]
    );
  };

  const getDisplayName = () => {
    if (!profile) return 'Пользователь';

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

    return fullName || profile.username || 'Пользователь';
  };

  const getInitials = () => {
    if (!profile) return 'П';

    const firstLetter = profile.first_name ? profile.first_name[0] : '';
    const lastLetter = profile.last_name ? profile.last_name[0] : '';

    if (firstLetter || lastLetter) {
      return `${firstLetter}${lastLetter}`;
    }

    return profile.username ? profile.username[0].toUpperCase() : 'П';
  };

  const getRoleTitle = () => {
    if (!profile) return 'Участник семьи';

    if (family?.admin === profile.id) return 'Администратор семьи';
    if (profile.role === 'admin') return 'Администратор';
    if (profile.role === 'adult') return 'Взрослый участник';
    if (profile.role === 'child') return 'Ребёнок';

    return 'Участник семьи';
  };

  const getFamilyName = () => {
    return family?.name || 'Семья не выбрана';
  };

  const getFamilyMembersCount = () => {
    if (!family?.members || !Array.isArray(family.members)) {
      return 0;
    }

    return family.members.length;
  };

  const getInviteCode = () => {
    return family?.invite_code || 'нет кода';
  };

  const getPersonalInfoSubtitle = () => {
    const phone = profile?.phone || 'телефон не указан';
    const email = profile?.email || 'почта не указана';
    const city = profile?.city || 'город не указан';

    return `${phone} · ${email} · ${city}`;
  };

  const getMedicalInfoSubtitle = () => {
    const bloodType = profile?.blood_type || 'группа крови не указана';
    const allergies = profile?.allergies || 'аллергии не указаны';

    return `${bloodType} · ${allergies}`;
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить аккаунт?',
      'Аккаунт будет удалён. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();

              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert(
                'Ошибка',
                error.response?.data?.error ||
                  error.response?.data?.detail ||
                  'Не удалось удалить аккаунт'
              );
            }
          },
        },
      ]
    );
  };

  const pickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Нет доступа',
          'Разрешите доступ к галерее, чтобы выбрать фото профиля.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;

      const image = result.assets?.[0];

      if (!image?.uri) {
        Alert.alert('Аватар', 'Не удалось получить изображение.');
        return;
      }

      setAvatarUploading(true);

      const data = await uploadProfileAvatar(image);

      setAvatarUrl(data.avatar_url);

      setProfile((prev) => ({
        ...prev,
        avatar_url: data.avatar_url,
      }));

      Alert.alert('Профиль', 'Аватар обновлён.');
    } catch (error) {
      Alert.alert(
        'Профиль',
        error.response?.data?.error ||
          error.response?.data?.detail ||
          'Не удалось загрузить аватар'
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const renderInfoRow = ({
    icon,
    label,
    value,
    onPress,
    iconColor = '#9456FE',
  }) => (
    <TouchableOpacity
      style={styles.infoRow}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel} allowFontScaling={false}>
          {label}
        </Text>

        <Text
          style={styles.infoValue}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {value || 'Не указано'}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#B8B8B8" />
    </TouchableOpacity>
  );

  const renderSectionHeader = (title) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} allowFontScaling={false}>
        {title}
      </Text>
    </View>
  );

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9456FE" />

          <Text style={styles.loadingText} allowFontScaling={false}>
            Загрузка профиля...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#262626" />
          </TouchableOpacity>

          <Text style={styles.title} allowFontScaling={false}>
            Профиль
          </Text>

          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.profileTop}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              activeOpacity={0.85}
              onPress={pickAvatar}
              disabled={avatarUploading}
            >
              <CachedAvatar
                uri={avatarUrl}
                size={104}
                backgroundColor="#F3ECFF"
                icon="person"
                iconSize={40}
                iconColor="#9456FE"
              />

              {!avatarUrl && (
                <Text style={styles.avatarLetters} allowFontScaling={false}>
                  {getInitials()}
                </Text>
              )}

              <View style={styles.avatarEditButton}>
                {avatarUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={15} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>

            <Text
              style={styles.userName}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {getDisplayName()}
            </Text>

            <View style={styles.roleBadge}>
              <Ionicons name="people-outline" size={15} color="#9456FE" />

              <Text style={styles.roleText} allowFontScaling={false}>
                {getRoleTitle()}
              </Text>
            </View>

            <Text style={styles.familyName} allowFontScaling={false}>
              {getFamilyName()}
            </Text>
          </View>

          {renderSectionHeader('Основная информация')}

          <View style={styles.card}>
            {renderInfoRow({
              icon: 'person-circle-outline',
              label: 'Личная информация',
              value: getPersonalInfoSubtitle(),
              onPress: () => navigation.navigate('PersonalInfo'),
            })}

            <View style={styles.divider} />

            {renderInfoRow({
              icon: 'medical-outline',
              iconColor: '#EF4444',
              label: 'Медицинская информация',
              value: getMedicalInfoSubtitle(),
              onPress: () => navigation.navigate('MedicalInfo'),
            })}
          </View>

          {renderSectionHeader('Семья')}

          <View style={styles.card}>
            {renderInfoRow({
              icon: 'people-outline',
              label: 'Участники семьи',
              value: family
                ? `${getFamilyMembersCount()} участников · роли и список семьи`
                : 'Семья пока не выбрана',
              onPress: () => navigation.navigate('FamilyMembers'),
            })}

            <View style={styles.divider} />

            {renderInfoRow({
              icon: 'qr-code-outline',
              iconColor: '#10B981',
              label: 'Пригласить в семью',
              value: family
                ? `QR-код, ссылка и код ${getInviteCode()}`
                : 'Код появится после создания семьи',
              onPress: () => navigation.navigate('InviteFamily'),
            })}
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={22} color="#FA4B4B" />

            <Text style={styles.logoutText} allowFontScaling={false}>
              Выйти из аккаунта
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            activeOpacity={0.8}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={22} color="#FA4B4B" />

            <Text style={styles.deleteAccountText} allowFontScaling={false}>
              Удалить аккаунт
            </Text>
          </TouchableOpacity>
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

  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },

  headerRightPlaceholder: {
    width: 24,
    height: 24,
  },

  title: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#262626',
  },

  scrollContent: {
    paddingBottom: 130,
  },

  profileTop: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 22,
  },

  avatarWrapper: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatarLetters: {
    position: 'absolute',
    fontFamily: fontFamily.medium,
    fontSize: 34,
    color: '#9456FE',
  },

  avatarEditButton: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9456FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  userName: {
    maxWidth: '100%',
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    color: '#262626',
  },

  roleBadge: {
    marginTop: 8,
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  roleText: {
    marginLeft: 6,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#9456FE',
  },

  familyName: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  sectionHeader: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  card: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
  },

  infoRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  infoTextBlock: {
    flex: 1,
  },

  infoLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  infoValue: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginLeft: 50,
  },

  logoutButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#FFF0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  logoutText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FA4B4B',
  },

  deleteAccountButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#FFF0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  deleteAccountText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FA4B4B',
  },
});