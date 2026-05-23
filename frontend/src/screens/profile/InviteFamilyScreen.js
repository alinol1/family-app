import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';

import * as Clipboard from 'expo-clipboard';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { getMyFamily } from '../../api/family';

const APP_DOMAIN = 'https://mayak-family.ru';

export default function InviteFamilyScreen({ navigation }) {
  const { screenPadding } = useLayout();

  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState(null);

  useEffect(() => {
    loadFamily();
  }, []);

  const loadFamily = async () => {
    try {
      setLoading(true);

      const data = await getMyFamily();

      setFamily(data);
    } catch (error) {
      console.log('Ошибка загрузки приглашения семьи');

      Alert.alert(
        'Ошибка',
        'Не удалось загрузить данные приглашения'
      );
    } finally {
      setLoading(false);
    }
  };

  const getInviteCode = () => {
    return family?.invite_code || '';
  };

  const getFamilyName = () => {
    return family?.name || 'Моя семья';
  };

  const getInviteLink = () => {
    const inviteCode = getInviteCode();

    if (!inviteCode) {
      return '';
    }

    return `${APP_DOMAIN}/join/${inviteCode}`;
  };

  const copyText = async (text, successMessage) => {
    if (!text) {
      Alert.alert(
        'Ошибка',
        'Нет данных для копирования'
      );
      return;
    }

    await Clipboard.setStringAsync(text);

    Alert.alert(
      'Готово',
      successMessage
    );
  };

  const shareInvite = async () => {
    const inviteCode = getInviteCode();
    const inviteLink = getInviteLink();
    const familyName = getFamilyName();

    if (!inviteCode) {
      Alert.alert(
        'Ошибка',
        'Код приглашения не найден'
      );
      return;
    }

    try {
      await Share.share({
        message:
          `Присоединяйся к семье “${familyName}” в приложении Маяк.\n\n` +
          `Код приглашения: ${inviteCode}\n` +
          `Ссылка: ${inviteLink}`,
      });
    } catch (error) {
      Alert.alert(
        'Ошибка',
        'Не удалось открыть меню отправки'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9456FE" />

          <Text style={styles.loadingText} allowFontScaling={false}>
            Загрузка приглашения...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!family || !getInviteCode()) {
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
              Пригласить в семью
            </Text>

            <View style={styles.headerRightPlaceholder} />
          </View>

          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="qr-code-outline" size={32} color="#9456FE" />
            </View>

            <Text style={styles.emptyTitle} allowFontScaling={false}>
              Код приглашения не найден
            </Text>

            <Text style={styles.emptySubtitle} allowFontScaling={false}>
              Не удалось получить код семьи. Попробуйте обновить экран.
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

  const inviteCode = getInviteCode();
  const inviteLink = getInviteLink();
  const familyName = getFamilyName();

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
            Пригласить в семью
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
                {familyName}
              </Text>

              <Text style={styles.familySubtitle} allowFontScaling={false}>
                Отправьте код или QR-код родственнику, чтобы он смог присоединиться.
              </Text>
            </View>
          </View>

          <View style={styles.qrCard}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={inviteLink}
                size={210}
                backgroundColor="#FFFFFF"
                color="#262626"
              />
            </View>

            <Text style={styles.qrTitle} allowFontScaling={false}>
              QR-код приглашения
            </Text>

            <Text style={styles.qrSubtitle} allowFontScaling={false}>
              Его можно отсканировать камерой телефона
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="key-outline" size={20} color="#9456FE" />
              </View>

              <View style={styles.infoTextBlock}>
                <Text style={styles.infoLabel} allowFontScaling={false}>
                  Код приглашения
                </Text>

                <Text
                  style={styles.inviteCode}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {inviteCode}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.smallButton}
                activeOpacity={0.75}
                onPress={() => copyText(
                  inviteCode,
                  'Код приглашения скопирован'
                )}
              >
                <Ionicons name="copy-outline" size={18} color="#9456FE" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="link-outline" size={20} color="#9456FE" />
              </View>

              <View style={styles.infoTextBlock}>
                <Text style={styles.infoLabel} allowFontScaling={false}>
                  Ссылка приглашения
                </Text>

                <Text
                  style={styles.infoValue}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {inviteLink}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.smallButton}
                activeOpacity={0.75}
                onPress={() => copyText(
                  inviteLink,
                  'Ссылка приглашения скопирована'
                )}
              >
                <Ionicons name="copy-outline" size={18} color="#9456FE" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoNotice}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#9456FE"
            />

            <Text style={styles.infoNoticeText} allowFontScaling={false}>
              Передавайте приглашение только тем людям, которых хотите добавить в свою семью.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.shareButton}
            activeOpacity={0.85}
            onPress={shareInvite}
          >
            <Ionicons name="share-social-outline" size={21} color="#FFFFFF" />

            <Text style={styles.shareButtonText} allowFontScaling={false}>
              Поделиться приглашением
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => copyText(
              inviteCode,
              'Код приглашения скопирован'
            )}
          >
            <Ionicons name="copy-outline" size={21} color="#9456FE" />

            <Text style={styles.secondaryButtonText} allowFontScaling={false}>
              Скопировать код
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
    marginBottom: 16,
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
    marginTop: 5,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: '#6F45B8',
  },

  qrCard: {
    borderRadius: 28,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  qrWrapper: {
    width: 246,
    height: 246,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  qrTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
  },

  qrSubtitle: {
    marginTop: 5,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#858585',
  },

  card: {
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
  },

  infoRow: {
    minHeight: 72,
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
    paddingRight: 8,
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

  inviteCode: {
    marginTop: 3,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleM,
    letterSpacing: 2,
    color: '#262626',
  },

  smallButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginLeft: 50,
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

  shareButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#9456FE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  shareButtonText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  secondaryButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F3ECFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryButtonText: {
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
    maxWidth: 280,
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