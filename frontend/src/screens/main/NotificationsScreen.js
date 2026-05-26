import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import {
  getNotifications,
  markNotificationsRead,
} from '../../api/notifications';

const MAIN_COLOR = '#9456FE';

function formatDate(dateString) {
  if (!dateString) return '';

  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsScreen() {
  const { screenPadding } = useLayout();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    const data = await getNotifications();
    console.log('NOTIFICATIONS DATA:', data);
    setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    await markNotificationsRead();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        try {
          setLoading(true);
          await loadNotifications();
        } finally {
          setLoading(false);
        }
      };

      run();
    }, [loadNotifications])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const getIconName = (type) => {
    if (type === 'sos') return 'warning';
    if (type === 'task') return 'checkbox-outline';
    return 'notifications-outline';
  };

  const getIconColor = (type) => {
    if (type === 'sos') return '#FA4B4B';
    if (type === 'task') return MAIN_COLOR;
    return '#858585';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
        <Text style={styles.screenTitle} allowFontScaling={false}>
          Уведомления
        </Text>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color={MAIN_COLOR} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={MAIN_COLOR}
                colors={[MAIN_COLOR]}
              />
            }
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="notifications-outline" size={32} color="#A4A4A4" />

                <Text style={styles.emptyText} allowFontScaling={false}>
                  Уведомлений пока нет
                </Text>
              </View>
            ) : (
              notifications.map((item) => (
                <View key={item.id} style={styles.notificationCard}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: item.notification_type === 'sos' ? '#FFF0F0' : '#F3ECFF' },
                    ]}
                  >
                    <Ionicons
                      name={getIconName(item.notification_type)}
                      size={23}
                      color={getIconColor(item.notification_type)}
                    />
                  </View>

                  <View style={styles.notificationTextBlock}>
                    <Text
                      style={styles.notificationTitle}
                      allowFontScaling={false}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={styles.notificationMessage}
                      allowFontScaling={false}
                      numberOfLines={2}
                    >
                      {item.message}
                    </Text>

                    <Text style={styles.notificationDate} allowFontScaling={false}>
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
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
  screenTitle: {
    marginTop: 18,
    marginBottom: 22,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#262626',
  },
  loadingBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  emptyCard: {
    minHeight: 130,
    borderRadius: 28,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  emptyText: {
    marginTop: 10,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#8A8A8A',
  },
  notificationCard: {
    minHeight: 86,
    borderRadius: 26,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTextBlock: {
    flex: 1,
  },
  notificationTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },
  notificationMessage: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyS || 14,
    color: '#606060',
    lineHeight: 19,
  },
  notificationDate: {
    marginTop: 5,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#9A9A9A',
  },
});