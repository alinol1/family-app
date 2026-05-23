import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { getMyFamily } from '../../api/family';

export default function FamilyMembersScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadFamily();
  }, []);

  const loadFamily = async () => {
    try {
      setLoading(true);

      const data = await getMyFamily();

      setFamily(data);
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (error) {
      console.log('Ошибка загрузки семьи');

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить участников семьи'
      );
    } finally {
      setLoading(false);
    }
  };

  const openMember = (member) => {
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();

    Alert.alert(
      fullName || 'Участник семьи',
      'Профиль участника подключим позже'
    );
  };

  const getRoleTitle = (role) => {
    if (role === 'admin') {
      return 'Администратор семьи';
    }

    if (role === 'adult') {
      return 'Взрослый участник';
    }

    if (role === 'child') {
      return 'Ребёнок';
    }

    return 'Участник семьи';
  };

  const getInitials = (member) => {
    const firstLetter = member.first_name ? member.first_name[0] : '';
    const lastLetter = member.last_name ? member.last_name[0] : '';

    return `${firstLetter}${lastLetter}` || 'У';
  };

  const getMemberName = (member) => {
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();

    return fullName || 'Участник семьи';
  };

  const isCurrentUserAdmin = () => {
    if (!family) {
      return false;
    }

    return family.admin === getCurrentUserId();
  };

  const getCurrentUserId = () => {
    const currentUser = members.find((member) => member.is_current_user);

    if (currentUser) {
      return currentUser.user_id;
    }

    return null;
  };

  const getAdminName = () => {
    if (family?.admin_name) {
      return family.admin_name.trim();
    }

    const adminMember = members.find((member) => member.user_id === family?.admin);

    if (adminMember) {
      return getMemberName(adminMember);
    }

    return 'Не указан';
  };

  const renderMember = (member) => {
    const memberName = getMemberName(member);
    const roleTitle = getRoleTitle(member.role);
    const phone = member.phone || 'Телефон не указан';

    return (
      <TouchableOpacity
        key={member.id}
        style={styles.memberRow}
        activeOpacity={0.75}
        onPress={() => openMember(member)}
      >
        <View style={styles.avatarWrapper}>
          {member.avatar ? (
            <Image
              source={{ uri: member.avatar }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetters} allowFontScaling={false}>
                {getInitials(member)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.memberTextBlock}>
          <View style={styles.nameRow}>
            <Text
              style={styles.memberName}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {memberName}
            </Text>

            {member.is_current_user && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText} allowFontScaling={false}>
                  Вы
                </Text>
              </View>
            )}
          </View>

          <Text
            style={styles.memberRole}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {roleTitle}
          </Text>

          <Text
            style={styles.memberPhone}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {phone}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#B8B8B8" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9456FE" />

          <Text style={styles.loadingText} allowFontScaling={false}>
            Загрузка участников семьи...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!family) {
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
              Участники семьи
            </Text>

            <View style={styles.headerRightPlaceholder} />
          </View>

          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={32} color="#9456FE" />
            </View>

            <Text style={styles.emptyTitle} allowFontScaling={false}>
              Семья не найдена
            </Text>

            <Text style={styles.emptySubtitle} allowFontScaling={false}>
              Вы пока не состоите в семье или данные не удалось загрузить.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.85}
              onPress={loadFamily}
            >
              <Text style={styles.retryButtonText} allowFontScaling={false}>
                Повторить
              </Text>
            </TouchableOpacity>
          </View>
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
            Участники семьи
          </Text>

          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.familyCard}>
            <View style={styles.familyIcon}>
              <Ionicons name="people-outline" size={26} color="#9456FE" />
            </View>

            <View style={styles.familyTextBlock}>
              <Text
                style={styles.familyName}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {family.name || 'Моя семья'}
              </Text>

              <Text style={styles.familySubtitle} allowFontScaling={false}>
                {members.length} участников
              </Text>

              <Text
                style={styles.familyAdmin}
                allowFontScaling={false}
                numberOfLines={1}
              >
                Администратор: {getAdminName()}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>
              Список участников
            </Text>
          </View>

          <View style={styles.card}>
            {members.map((member, index) => (
              <View key={member.id}>
                {renderMember(member)}

                {index !== members.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </View>

          <View style={styles.infoNotice}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#9456FE"
            />

            <Text style={styles.infoNoticeText} allowFontScaling={false}>
              Здесь отображаются участники семьи и их роли. Позже администратор сможет управлять ролями и доступом.
            </Text>
          </View>

          {isCurrentUserAdmin() && (
            <TouchableOpacity
              style={styles.adminButton}
              activeOpacity={0.85}
              onPress={() => Alert.alert('Управление семьёй', 'Этот раздел подключим позже')}
            >
              <Ionicons name="settings-outline" size={21} color="#9456FE" />

              <Text style={styles.adminButtonText} allowFontScaling={false}>
                Управление семьёй
              </Text>
            </TouchableOpacity>
          )}
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

  title: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleM,
    color: '#262626',
  },

  headerRightPlaceholder: {
    width: 24,
    height: 24,
  },

  scrollContent: {
    paddingBottom: 130,
  },

  familyCard: {
    borderRadius: 24,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },

  familyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  familyTextBlock: {
    flex: 1,
  },

  familyName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  familySubtitle: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#6F45B8',
  },

  familyAdmin: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  sectionHeader: {
    marginBottom: 10,
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

  memberRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },

  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarLetters: {
    fontFamily: fontFamily.medium,
    fontSize: 17,
    color: '#9456FE',
  },

  memberTextBlock: {
    flex: 1,
    paddingRight: 8,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  memberName: {
    flexShrink: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },

  youBadge: {
    marginLeft: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  youBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#9456FE',
  },

  memberRole: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#9456FE',
  },

  memberPhone: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginLeft: 60,
  },

  infoNotice: {
    borderRadius: 20,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    marginBottom: 16,
  },

  infoNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: '#6F45B8',
  },

  adminButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  adminButtonText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#9456FE',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3ECFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  emptySubtitle: {
    marginTop: 8,
    maxWidth: 260,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: '#858585',
  },

  retryButton: {
    marginTop: 20,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#9456FE',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  retryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },
});