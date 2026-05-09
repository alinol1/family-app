import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  Platform,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily } from '../utils/fonts';
import { getProfile } from '../api/auth';

const WS_BASE_URL = Platform.OS === 'web'
  ? 'ws://127.0.0.1:8000'
  : 'ws://192.168.3.2:8000';

function getToastText(type, name) {
  if (type === 'confirmed_by_me') {
    return 'Вы подтвердили получение сигнала';
  }

  if (type === 'confirmed_by_relative') {
    return `${name} увидел сигнал`;
  }

  if (type === 'cancelled_by_relative') {
    return `${name} отменил SOS-сигнал`;
  }

  return '';
}

function getEventUser(data, key) {
  return data?.[key] || {
    id: data?.[`${key}_id`],
    name: data?.[`${key}_name`],
  };
}

export default function SOSGlobalOverlay() {
  const socketRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const toastTimerRef = useRef(null);

  const toastTranslateY = useRef(new Animated.Value(-120)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const [toastVisible, setToastVisible] = useState(false);
  const [toastText, setToastText] = useState('');

  const showToast = (text) => {
    if (!text) return;

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToastText(text);
    setToastVisible(true);

    toastTranslateY.setValue(-120);
    toastOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(toastTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 160,
      }),
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    toastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastTranslateY, {
          toValue: -120,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastVisible(false);
      });
    }, 3000);
  };

  const handleSOSConfirmed = (data) => {
    const signal = data.signal;
    const confirmedBy = getEventUser(data, 'confirmed_by');

    if (!signal || !confirmedBy) return;

    const currentUserId = Number(currentUserIdRef.current);
    const signalSenderId = Number(signal.sender);
    const confirmedById = Number(confirmedBy.id);
    const confirmedByName = confirmedBy.name || 'Пользователь';

    if (signalSenderId === currentUserId) {
      showToast(getToastText('confirmed_by_relative', confirmedByName));
      return;
    }

    if (confirmedById === currentUserId) {
      showToast(getToastText('confirmed_by_me'));
    }
  };

  const handleSOSCancelled = (data) => {
    const cancelledBy = getEventUser(data, 'cancelled_by');

    if (!cancelledBy) return;

    const currentUserId = Number(currentUserIdRef.current);
    const cancelledById = Number(cancelledBy.id);
    const cancelledByName = cancelledBy.name || 'Пользователь';

    if (cancelledById !== currentUserId) {
      showToast(getToastText('cancelled_by_relative', cancelledByName));
    }
  };

  const connectSocket = async () => {
    const token = await AsyncStorage.getItem('access_token');

    if (!token) return;

    const socket = new WebSocket(`${WS_BASE_URL}/ws/sos/?token=${token}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Global SOS Overlay WebSocket подключён');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // ВАЖНО:
        // sos_alert здесь НЕ показываем,
        // чтобы не было второго большого SOS-уведомления.
        if (data.type === 'sos_alert') {
          return;
        }

        if (data.type === 'sos_confirmed') {
          handleSOSConfirmed(data);
          return;
        }

        if (data.type === 'sos_cancelled') {
          handleSOSCancelled(data);
        }
      } catch (error) {
        console.log('Ошибка обработки Global SOS Overlay:', error);
      }
    };

    socket.onerror = (error) => {
      console.log('Global SOS Overlay WebSocket ошибка:', error);
    };

    socket.onclose = () => {
      console.log('Global SOS Overlay WebSocket закрыт');
    };
  };

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await getProfile();
        currentUserIdRef.current = profile.id;

        await connectSocket();
      } catch (error) {
        console.log(
          'Ошибка запуска Global SOS Overlay:',
          error.response?.data || error
        );
      }
    };

    init();

    return () => {
      socketRef.current?.close();

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return (
    <Modal
      visible={toastVisible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View pointerEvents="none" style={styles.toastOverlay}>
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={22} color="#41BF67" />

          <Text style={styles.toastText} allowFontScaling={false}>
            {toastText}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastOverlay: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },

  toast: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,

    elevation: 10,
  },

  toastText: {
    flex: 1,
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: '#313131',
  },
});