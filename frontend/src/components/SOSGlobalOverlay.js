import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Platform,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
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

function normalizeUser(data, prefix) {
  return data?.[prefix] || {
    id: data?.[`${prefix}_id`],
    name: data?.[`${prefix}_name`],
  };
}

export default function SOSGlobalOverlay() {
  const navigation = useNavigation();

  const socketRef = useRef(null);
  const currentUserIdRef = useRef(null);

  const toastTranslateY = useRef(new Animated.Value(-120)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastText, setToastText] = useState('');

  const [incomingVisible, setIncomingVisible] = useState(false);
  const [incomingSenderName, setIncomingSenderName] = useState('Пользователь');
  const [incomingSignal, setIncomingSignal] = useState(null);

  const showToast = (text) => {
    if (!text) return;

    console.log('GLOBAL SOS TOAST:', text);

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

  const openSOSScreen = () => {
    setIncomingVisible(false);

    navigation.navigate('SOS', {
      signal: incomingSignal,
    });
  };

  const closeModalButKeepSOS = () => {
    setIncomingVisible(false);
  };

  const handleSOSAlert = (data) => {
    const signal = data.signal;

    if (!signal) return;

    if (signal.sender === currentUserIdRef.current) {
      return;
    }

    setIncomingSignal(signal);
    setIncomingSenderName(signal.sender_name || 'Пользователь');
    setIncomingVisible(true);
  };

  const handleSOSConfirmed = (data) => {
    const signal = data.signal;

    const confirmedBy =
      normalizeUser(data, 'confirmed_by') ||
      normalizeUser(data, 'confirmedBy');

    if (!signal || !confirmedBy) return;

    const confirmedById = Number(confirmedBy.id);
    const currentUserId = Number(currentUserIdRef.current);
    const confirmedByName = confirmedBy.name || 'Пользователь';

    if (Number(signal.sender) === currentUserId) {
      showToast(getToastText('confirmed_by_relative', confirmedByName));
      return;
    }

    if (confirmedById === currentUserId) {
      showToast(getToastText('confirmed_by_me'));
    }
  };

  const handleSOSCancelled = (data) => {
    const cancelledBy =
      normalizeUser(data, 'cancelled_by') ||
      normalizeUser(data, 'cancelledBy');

    setIncomingVisible(false);
    setIncomingSignal(null);

    if (!cancelledBy) return;

    const cancelledById = Number(cancelledBy.id);
    const currentUserId = Number(currentUserIdRef.current);
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
      console.log('Global SOS WebSocket подключён');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        console.log('GLOBAL SOS EVENT:', data);

        if (data.type === 'sos_alert') {
          handleSOSAlert(data);
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
        console.log('Ошибка обработки Global SOS события:', error);
      }
    };

    socket.onerror = (error) => {
      console.log('Global SOS WebSocket ошибка:', error);
    };

    socket.onclose = () => {
      console.log('Global SOS WebSocket закрыт');
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
    <>
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

      <Modal
        visible={incomingVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModalButKeepSOS}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="warning" size={34} color="#FFFFFF" />
            </View>

            <Text style={styles.modalTitle} allowFontScaling={false}>
              SOS-сигнал
            </Text>

            <Text style={styles.modalText} allowFontScaling={false}>
              {incomingSenderName} отправил сигнал тревоги. Возможно, ему нужна помощь.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={openSOSScreen}
            >
              <Text style={styles.primaryButtonText} allowFontScaling={false}>
                Открыть
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={openSOSScreen}
            >
              <Ionicons name="call" size={20} color="#FA4B4B" />

              <Text style={styles.secondaryButtonText} allowFontScaling={false}>
                Позвонить
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.7}
              onPress={closeModalButKeepSOS}
            >
              <Text style={styles.closeButtonText} allowFontScaling={false}>
                Закрыть
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
    shadowOffset: { width: 0, height: 8 },
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 22,
    alignItems: 'center',
  },

  modalIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FA4B4B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    color: '#262626',
    marginBottom: 8,
  },

  modalText: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 23,
    color: '#606060',
    textAlign: 'center',
    marginBottom: 20,
  },

  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FA4B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: '#FFFFFF',
  },

  secondaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F6F6F6',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },

  secondaryButtonText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: '#FA4B4B',
  },

  closeButton: {
    marginTop: 14,
  },

  closeButtonText: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: '#8A8A8A',
  },
});