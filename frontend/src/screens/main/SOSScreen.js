import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  useWindowDimensions,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';
import { getProfile } from '../../api/auth';
import { getAccessToken } from '../../api/tokenStorage';
import { usePresence } from '../../context/PresenceContext';
import { getMedicalInfo } from '../../api/medical';
import { getCurrentLocation } from '../../utils/location';

import { WS_BASE_URL } from '../../config/api';

import {
  sendSOS,
  getActiveSOS,
  confirmSOS,
  cancelSOS,
} from '../../api/sos';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BASE_HEIGHT = 812;
const BOTTOM_TAB_HEIGHT = 85;
const SHEET_COLLAPSED_HEIGHT = 96;

const HOLD_DURATION = 3000;
const CIRCLE_SIZE = 112;
const STROKE_WIDTH = 7;

const ACTIVE_SOS_STATUSES = ['sent', 'received', 'confirmed'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function scaleByHeight(screenHeight, minValue, maxValue) {
  const ratio = clamp((screenHeight - 640) / (BASE_HEIGHT - 640), 0, 1);
  return Math.round(minValue + (maxValue - minValue) * ratio);
}

function getMetrics(screenHeight) {
  return {
    topBarHeight: scaleByHeight(screenHeight, 64, 72),

    gapFromTab: Platform.OS === 'web'
      ? -9
      : scaleByHeight(screenHeight, 26, 38),

    sheetMaxHeight: scaleByHeight(screenHeight, 392, 430),

    infoTop: scaleByHeight(screenHeight, 12, 16),
    actionsTop: scaleByHeight(screenHeight, 14, 18),
    sosTop: scaleByHeight(screenHeight, 14, 18),

    sosHeight: scaleByHeight(screenHeight, 106, 122),
    hintTop: scaleByHeight(screenHeight, 8, 12),

    titleSize: scaleByHeight(screenHeight, 28, 32),
    textSize: scaleByHeight(screenHeight, 18, 20),
    buttonTextSize: scaleByHeight(screenHeight, 16, 18),
  };
}

function getPersonWord(count) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'человек';
  }

  if (last === 1) {
    return 'человек';
  }

  if (last >= 2 && last <= 4) {
    return 'человека';
  }

  return 'человек';
}

function getOnlinePeopleText(count) {
  return `${count} ${getPersonWord(count)}`;
}

function formatActiveTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
}

function isSignalActive(signal) {
  if (!signal?.status) {
    return false;
  }

  return ACTIVE_SOS_STATUSES.includes(signal.status);
}

export default function SOSScreen({ navigation }) {
  const { screenPadding } = useLayout();
  const { height } = useWindowDimensions();

  const m = getMetrics(height);

  const bottomOffset = BOTTOM_TAB_HEIGHT + m.gapFromTab;

  const availableHeight = height - m.topBarHeight - bottomOffset;
  const sheetHeight = Math.min(m.sheetMaxHeight, availableHeight);

  const expandedY = 0;
  const collapsedY = Math.max(sheetHeight - SHEET_COLLAPSED_HEIGHT, 0);

  const translateY = useRef(new Animated.Value(expandedY)).current;
  const currentY = useRef(expandedY);

  const sosProgress = useRef(new Animated.Value(0)).current;
  const cancelProgress = useRef(new Animated.Value(0)).current;

  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const isMountedRef = useRef(false);
  const currentUserIdRef = useRef(null);

  const sendingSOSRef = useRef(false);
  const cancellingSOSRef = useRef(false);
  const confirmingSOSRef = useRef(false);

  const [collapsed, setCollapsed] = useState(false);
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [isHoldingCancel, setIsHoldingCancel] = useState(false);

  const [sosState, setSosState] = useState('normal');
  const [activeSeconds, setActiveSeconds] = useState(0);

  const [activeSignal, setActiveSignal] = useState(null);
  const [confirmedByNames, setConfirmedByNames] = useState([]);

  const [incomingSOSVisible, setIncomingSOSVisible] = useState(false);
  const [incomingSenderName, setIncomingSenderName] = useState('Пользователь');

  const [medicalModalVisible, setMedicalModalVisible] = useState(false);
  const [medicalInfo, setMedicalInfo] = useState(null);
  const [medicalLoading, setMedicalLoading] = useState(false);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocationDetected, setIsLocationDetected] = useState(false);

  const { membersPresence = [] } = usePresence();

  const radius = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  const isSenderActive = sosState === 'senderActive';
  const isReceiverActive = sosState === 'receiverActive';
  const isActiveSOS = isSenderActive || isReceiverActive;

  const safeMembersPresence = Array.isArray(membersPresence)
    ? membersPresence
    : [];

  const onlineCount = safeMembersPresence.filter(
    (member) => member?.is_online && !member?.is_current_user
  ).length;

  const onlinePeopleText = getOnlinePeopleText(onlineCount);

  const getActiveSosUserId = () => {
    if (!activeSignal) {
      return null;
    }

    return (
      activeSignal.user_id ||
      activeSignal.sender_id ||
      activeSignal.created_by_id ||
      activeSignal.user?.id ||
      activeSignal.sender?.id ||
      activeSignal.sender ||
      null
    );
  };

  const getActiveSOSLocation = () => {
    if (!activeSignal) {
      return null;
    }

    const latitude = Number(
      activeSignal.latitude ||
        activeSignal.lat ||
        activeSignal.location_latitude
    );

    const longitude = Number(
      activeSignal.longitude ||
        activeSignal.lng ||
        activeSignal.location_longitude
    );

    if (!latitude || !longitude) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  };

  const activeSOSLocation = getActiveSOSLocation();

  const mapLocation =
    isReceiverActive && activeSOSLocation
      ? activeSOSLocation
      : currentLocation;

  const hasMapLocation = Boolean(
    mapLocation?.latitude && mapLocation?.longitude
  );

  const mapRegion = hasMapLocation
    ? {
        latitude: mapLocation.latitude,
        longitude: mapLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 55.751244,
        longitude: 37.618423,
        latitudeDelta: 0.25,
        longitudeDelta: 0.25,
      };

  const mapMarkerTitle = isReceiverActive
    ? incomingSenderName
    : 'Вы здесь';

  useEffect(() => {
    if (!isActiveSOS) return;

    const interval = setInterval(() => {
      setActiveSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActiveSOS]);

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const resetToNormal = () => {
    setSosState('normal');
    setActiveSignal(null);
    setActiveSeconds(0);
    setConfirmedByNames([]);
    setIncomingSOSVisible(false);

    sendingSOSRef.current = false;
    cancellingSOSRef.current = false;
    confirmingSOSRef.current = false;

    setIsHoldingSOS(false);
    setIsHoldingCancel(false);

    sosProgress.stopAnimation();
    cancelProgress.stopAnimation();
    sosProgress.setValue(0);
    cancelProgress.setValue(0);
  };

  const activateSenderScreen = (signal) => {
    if (!isSignalActive(signal)) {
      resetToNormal();
      return;
    }

    setActiveSignal(signal);
    setConfirmedByNames(signal?.confirmed_by_names || []);
    setIncomingSenderName(signal?.sender_name || 'Пользователь');
    setSosState('senderActive');
    setActiveSeconds(0);
    setIncomingSOSVisible(false);
  };

  const activateReceiverScreen = (signal, showModal = true) => {
    if (!isSignalActive(signal)) {
      resetToNormal();
      return;
    }

    setActiveSignal(signal);
    setConfirmedByNames(signal?.confirmed_by_names || []);
    setIncomingSenderName(signal?.sender_name || 'Пользователь');
    setSosState('receiverActive');
    setActiveSeconds(0);

    if (showModal) {
      setIncomingSOSVisible(true);
    }
  };

  const handleIncomingSOSEvent = (data) => {
    const signal = data.signal;

    if (!signal) return;

    if (data.type === 'sos_alert') {
      if (!isSignalActive(signal)) {
        return;
      }

      if (Number(signal.sender) === Number(currentUserIdRef.current)) {
        activateSenderScreen(signal);
        return;
      }

      activateReceiverScreen(signal, true);
      return;
    }

    if (data.type === 'sos_confirmed') {
      const isCurrentUserSender =
        Number(signal.sender) === Number(currentUserIdRef.current);

      setActiveSignal(signal);
      setConfirmedByNames(signal.confirmed_by_names || []);
      setIncomingSOSVisible(false);

      if (isCurrentUserSender) {
        setSosState('senderActive');
      } else {
        setSosState('receiverActive');
      }

      return;
    }

    if (data.type === 'sos_cancelled') {
      resetToNormal();
    }
  };

  const connectSOSWebSocket = async () => {
    const token = await getAccessToken();

    if (!token || !isMountedRef.current) {
      return;
    }

    if (
      socketRef.current &&
      (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      )
    ) {
      return;
    }

    clearReconnectTimer();

    const socket = new WebSocket(
      `${WS_BASE_URL}/ws/sos/?token=${encodeURIComponent(token)}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      console.log('SOS WebSocket подключён');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleIncomingSOSEvent(data);
      } catch (error) {
        console.log('Ошибка обработки SOS события:', error);
      }
    };

    socket.onerror = (error) => {
      console.log('SOS WebSocket ошибка:', error?.message || error);
    };

    socket.onclose = (event) => {
      console.log(
        'SOS WebSocket закрыт:',
        'code =',
        event.code,
        'reason =',
        event.reason,
        'wasClean =',
        event.wasClean
      );

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (isMountedRef.current) {
        clearReconnectTimer();

        reconnectTimerRef.current = setTimeout(() => {
          connectSOSWebSocket();
        }, 1500);
      }
    };
  };

  const detectCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();

      if (!isMountedRef.current) {
        return location;
      }

      setCurrentLocation(location);
      setIsLocationDetected(true);

      return location;
    } catch (error) {
      console.log('Местоположение не определено:', error);

      if (isMountedRef.current) {
        setCurrentLocation(null);
        setIsLocationDetected(false);
      }

      return null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const initSOS = async () => {
      try {
        const profile = await getProfile();

        if (!isMountedRef.current) {
          return;
        }

        currentUserIdRef.current = profile.id;

        await connectSOSWebSocket();

        const signal = await getActiveSOS();

        if (!isMountedRef.current) {
          return;
        }

        if (signal && isSignalActive(signal)) {
          if (Number(signal.sender) === Number(profile.id)) {
            activateSenderScreen(signal);
          } else {
            activateReceiverScreen(signal, false);
          }
        } else {
          resetToNormal();
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.log('Ошибка проверки активного SOS:', error.response?.data || error);
        } else {
          resetToNormal();
        }
      }
    };

    initSOS();
    detectCurrentLocation();

    return () => {
      isMountedRef.current = false;

      clearReconnectTimer();

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const sendSOSRequest = async () => {
    if (sendingSOSRef.current || isActiveSOS) {
      return;
    }

    sendingSOSRef.current = true;

    try {
      const location = await detectCurrentLocation();

      const signal = await sendSOS(
        location?.latitude || null,
        location?.longitude || null,
        location?.accuracy
          ? `Точность: ${Math.round(location.accuracy)} м`
          : 'Местоположение не удалось определить'
      );

      activateSenderScreen(signal);
    } catch (error) {
      console.log('Ошибка отправки SOS:', error.response?.data || error);

      Alert.alert(
        'SOS',
        error.response?.data?.error ||
          error.response?.data?.detail ||
          'Не удалось отправить SOS-сигнал'
      );
    } finally {
      sendingSOSRef.current = false;
    }
  };

  const cancelSOSRequest = async () => {
    if (!activeSignal?.id || cancellingSOSRef.current) return;

    cancellingSOSRef.current = true;

    try {
      await cancelSOS(activeSignal.id);
      resetToNormal();
    } catch (error) {
      console.log('Ошибка отмены SOS:', error.response?.data || error);

      Alert.alert(
        'SOS',
        error.response?.data?.error ||
          error.response?.data?.detail ||
          'Не удалось отменить SOS-сигнал'
      );
    } finally {
      cancellingSOSRef.current = false;
    }
  };

  const confirmSOSRequest = async () => {
    if (!activeSignal?.id || confirmingSOSRef.current) return;

    confirmingSOSRef.current = true;

    try {
      const signal = await confirmSOS(activeSignal.id);

      setActiveSignal(signal);
      setConfirmedByNames(signal.confirmed_by_names || []);
      setIncomingSOSVisible(false);
      setSosState('receiverActive');
    } catch (error) {
      console.log('Ошибка подтверждения SOS:', error.response?.data || error);

      Alert.alert(
        'SOS',
        error.response?.data?.error ||
          error.response?.data?.detail ||
          'Не удалось подтвердить SOS-сигнал'
      );
    } finally {
      confirmingSOSRef.current = false;
    }
  };

  const startSOSHold = () => {
    if (isActiveSOS || sendingSOSRef.current) return;

    setIsHoldingSOS(true);

    Animated.timing(sosProgress, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsHoldingSOS(false);
        sosProgress.setValue(0);
        sendSOSRequest();
      }
    });
  };

  const stopSOSHold = () => {
    if (!isHoldingSOS) return;

    setIsHoldingSOS(false);
    sosProgress.stopAnimation();

    Animated.spring(sosProgress, {
      toValue: 0,
      useNativeDriver: false,
      damping: 14,
      stiffness: 120,
    }).start();
  };

  const startCancelHold = () => {
    if (!isSenderActive || cancellingSOSRef.current) return;

    setIsHoldingCancel(true);

    Animated.timing(cancelProgress, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsHoldingCancel(false);
        cancelProgress.setValue(0);
        cancelSOSRequest();
      }
    });
  };

  const stopCancelHold = () => {
    if (!isHoldingCancel) return;

    setIsHoldingCancel(false);
    cancelProgress.stopAnimation();

    Animated.spring(cancelProgress, {
      toValue: 0,
      useNativeDriver: false,
      damping: 14,
      stiffness: 120,
    }).start();
  };

  const openIncomingSOS = () => {
    setIncomingSOSVisible(false);

    if (activeSignal && isSignalActive(activeSignal)) {
      setSosState('receiverActive');
    }

    navigation.navigate('SOS');
  };

  const closeIncomingSOS = () => {
    setIncomingSOSVisible(false);

    if (activeSignal && isSignalActive(activeSignal)) {
      setSosState('receiverActive');
    }
  };

  const animateTo = (toValue) => {
    currentY.current = toValue;
    setCollapsed(toValue === collapsedY);

    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      damping: 24,
      stiffness: 190,
      mass: 0.8,
    }).start();
  };

  const openMedicalInfo = async () => {
    try {
      setMedicalLoading(true);
      setMedicalModalVisible(true);

      const activeSosUserId = isReceiverActive
        ? getActiveSosUserId()
        : null;

      const data = await getMedicalInfo(activeSosUserId);

      setMedicalInfo(data);
    } catch (error) {
      Alert.alert(
        'Медицинская информация',
        error.response?.data?.error ||
          error.response?.data?.detail ||
          'Не удалось загрузить медицинскую информацию'
      );

      setMedicalModalVisible(false);
    } finally {
      setMedicalLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dy) > 4;
      },

      onPanResponderMove: (_, gesture) => {
        let nextY = currentY.current + gesture.dy;

        if (nextY < expandedY) nextY = expandedY;
        if (nextY > collapsedY) nextY = collapsedY;

        translateY.setValue(nextY);
      },

      onPanResponderRelease: (_, gesture) => {
        const shouldCollapse = gesture.dy > 35 || gesture.vy > 0.45;
        const shouldExpand = gesture.dy < -35 || gesture.vy < -0.45;

        if (shouldCollapse) {
          animateTo(collapsedY);
          return;
        }

        if (shouldExpand) {
          animateTo(expandedY);
          return;
        }

        animateTo(collapsed ? collapsedY : expandedY);
      },
    })
  ).current;

  const renderProgressSvg = (progress, isVisible, trackColor = '#FFB8B8') => (
    <Svg
      width={CIRCLE_SIZE}
      height={CIRCLE_SIZE}
      style={styles.progressSvg}
    >
      <Circle
        stroke={trackColor}
        fill="none"
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={radius}
        strokeWidth={STROKE_WIDTH}
        opacity={isVisible ? 1 : 0}
      />

      <AnimatedCircle
        stroke="#FFFFFF"
        fill="none"
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={radius}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={progress.interpolate({
          inputRange: [0, 1],
          outputRange: [circumference, 0],
        })}
        rotation="-90"
        origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
        opacity={isVisible ? 1 : 0}
      />
    </Svg>
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        isActiveSOS && styles.safeAreaActive,
      ]}
      edges={['top']}
    >
      <StatusBar style={isActiveSOS ? 'light' : 'dark'} />

      <View
        style={[
          styles.container,
          isActiveSOS && styles.containerActive,
        ]}
      >
        <View
          style={[
            styles.topBar,
            isActiveSOS && styles.topBarActive,
            {
              height: m.topBarHeight,
              paddingHorizontal: screenPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.screenTitle,
              isActiveSOS && styles.screenTitleActive,
              { fontSize: m.titleSize },
            ]}
            allowFontScaling={false}
          >
            Безопасность
          </Text>

          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={28} color="#7B7B7B" />
          </TouchableOpacity>
        </View>

        <View style={[styles.mapContainer, { top: m.topBarHeight }]}>
          <View style={styles.map}>
            <View style={styles.mapFallbackOverlay}>
              <Ionicons name="location-outline" size={32} color="#858585" />

              <Text style={styles.mapFallbackText} allowFontScaling={false}>
                Карта временно отключена
              </Text>
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.bottomSheet,
            {
              height: sheetHeight,
              bottom: bottomOffset,
              paddingHorizontal: screenPadding,
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.sheetDragBlock}>
            <View style={styles.dragArea}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  isActiveSOS && styles.statusDotActive,
                ]}
              />

              <Text style={styles.statusText} allowFontScaling={false}>
                {isSenderActive ? (
                  <>
                    Сигнал <Text style={styles.statusAccent}>отправлен</Text> родным
                  </>
                ) : isReceiverActive ? (
                  <>
                    {incomingSenderName} отправил <Text style={styles.statusAccent}>SOS-сигнал</Text>
                  </>
                ) : (
                  'Сейчас все спокойно'
                )}
              </Text>
            </View>
          </View>

          <View style={[styles.infoTextBlock, { marginTop: m.infoTop }]}>
            <Text
              style={[styles.locationText, { fontSize: m.textSize }]}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {isSenderActive
                ? confirmedByNames.length > 0
                  ? `${confirmedByNames[0].name} увидел сигнал`
                  : 'Ожидаем подтверждения от родных...'
                : isReceiverActive
                  ? 'Расстояние до вас: 2.4 км'
                  : isLocationDetected
                    ? 'Ваше местоположение определено.'
                    : 'Ваше местоположение не определено.'}
            </Text>

            <Text
              style={[styles.onlineText, { fontSize: m.textSize }]}
              allowFontScaling={false}
            >
              {isReceiverActive ? (
                <>
                  Заряд телефона: <Text style={styles.onlineAccent}>18%</Text>
                </>
              ) : (
                <>
                  Сейчас в сети <Text style={styles.onlineAccent}>{onlinePeopleText}</Text>
                </>
              )}
            </Text>

            {isReceiverActive && (
              <>
                <View style={styles.receiverDivider} />

                <Text
                  style={[styles.onlineText, { fontSize: m.textSize }]}
                  allowFontScaling={false}
                >
                  Сейчас в сети{' '}
                  <Text style={styles.onlineAccent}>
                    {onlinePeopleText}
                  </Text>
                </Text>
              </>
            )}
          </View>

          <View style={[styles.actionsRow, { marginTop: m.actionsTop }]}>
            <TouchableOpacity
              style={styles.medicalButton}
              activeOpacity={0.85}
              onPress={openMedicalInfo}
            >
              <Text
                style={[
                  styles.medicalButtonText,
                  { fontSize: m.buttonTextSize },
                ]}
                allowFontScaling={false}
              >
                Медицинская информация
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.callButton,
                isReceiverActive && styles.callButtonReceiver,
              ]}
              activeOpacity={0.85}
            >
              {isReceiverActive ? (
                <Ionicons name="call" size={27} color="#6A6A6A" />
              ) : (
                <Text style={styles.callButtonText} allowFontScaling={false}>
                  112
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {isSenderActive ? (
            <View
              style={[
                styles.sosButtonOuter,
                {
                  height: m.sosHeight,
                  marginTop: m.sosTop,
                },
              ]}
            >
              {renderProgressSvg(cancelProgress, isHoldingCancel, '#A7E5B8')}

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    height: m.sosHeight,
                  },
                ]}
                activeOpacity={0.9}
                onPressIn={startCancelHold}
                onPressOut={stopCancelHold}
              >
                <Text style={styles.cancelButtonText} allowFontScaling={false}>
                  {isHoldingCancel ? 'Удерживайте...' : 'Отменить сигнал'}
                </Text>

                <Text style={styles.cancelTimerText} allowFontScaling={false}>
                  Сигнал активен {formatActiveTime(activeSeconds)}
                </Text>
              </TouchableOpacity>
            </View>
          ) : isReceiverActive ? (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  height: m.sosHeight,
                  marginTop: m.sosTop,
                },
              ]}
              activeOpacity={0.9}
              onPress={confirmSOSRequest}
            >
              <Text style={styles.cancelButtonText} allowFontScaling={false}>
                Подтвердить сигнал
              </Text>

              <Text style={styles.cancelTimerText} allowFontScaling={false}>
                Сигнал активен {formatActiveTime(activeSeconds)}
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.sosButtonOuter,
                {
                  height: m.sosHeight,
                  marginTop: m.sosTop,
                },
              ]}
            >
              {renderProgressSvg(sosProgress, isHoldingSOS, '#FFB8B8')}

              <TouchableOpacity
                style={[
                  styles.sosButton,
                  {
                    height: m.sosHeight,
                  },
                ]}
                activeOpacity={0.9}
                onPressIn={startSOSHold}
                onPressOut={stopSOSHold}
              >
                <Text style={styles.sosButtonText} allowFontScaling={false}>
                  {isHoldingSOS ? 'Удерживайте...' : 'Оповестить родных'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text
            style={[styles.hintText, { marginTop: m.hintTop }]}
            allowFontScaling={false}
          >
            {isSenderActive
              ? 'Для отмены сигнала удерживайте кнопку 3 секунды'
              : isReceiverActive
                ? 'Подтвердите сигнал, чтобы родной знал, что вы увидели'
                : 'Для отправки сигнала удерживайте кнопку 3 секунды'}
          </Text>
        </Animated.View>

        <Modal
          visible={incomingSOSVisible}
          transparent
          animationType="fade"
          onRequestClose={closeIncomingSOS}
        >
          <View style={styles.sosModalOverlay}>
            <View style={styles.sosModalCard}>
              <View style={styles.sosModalIcon}>
                <Ionicons name="warning" size={34} color="#FFFFFF" />
              </View>

              <Text style={styles.sosModalTitle} allowFontScaling={false}>
                SOS-сигнал
              </Text>

              <Text style={styles.sosModalText} allowFontScaling={false}>
                {incomingSenderName} отправил сигнал тревоги. Возможно, ему нужна помощь.
              </Text>

              <TouchableOpacity
                style={styles.sosModalPrimaryButton}
                activeOpacity={0.85}
                onPress={openIncomingSOS}
              >
                <Text style={styles.sosModalPrimaryText} allowFontScaling={false}>
                  Открыть
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sosModalSecondaryButton}
                activeOpacity={0.85}
                onPress={openIncomingSOS}
              >
                <Ionicons name="call" size={20} color="#FA4B4B" />

                <Text style={styles.sosModalSecondaryText} allowFontScaling={false}>
                  Позвонить
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sosModalClose}
                activeOpacity={0.7}
                onPress={closeIncomingSOS}
              >
                <Text style={styles.sosModalCloseText} allowFontScaling={false}>
                  Закрыть
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

      <Modal
        visible={medicalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMedicalModalVisible(false)}
      >
        <View style={styles.medicalOverlay}>
          <View style={styles.medicalCard}>
            <View style={styles.medicalHeader}>
              <Text style={styles.medicalTitle} allowFontScaling={false}>
                Медицинская информация
              </Text>

              <TouchableOpacity
                style={styles.medicalCloseButton}
                onPress={() => setMedicalModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            {medicalLoading ? (
              <View style={styles.medicalLoadingBlock}>
                <ActivityIndicator size="small" color="#9456FE" />
              </View>
            ) : (
              <>
                <Text style={styles.medicalName} allowFontScaling={false}>
                  {medicalInfo?.full_name || 'Пользователь'}
                </Text>

                <View style={styles.medicalRow}>
                  <Text style={styles.medicalLabel} allowFontScaling={false}>
                    Группа крови
                  </Text>
                  <Text style={styles.medicalValue} allowFontScaling={false}>
                    {medicalInfo?.blood_type || 'Не указано'}
                  </Text>
                </View>

                <View style={styles.medicalRow}>
                  <Text style={styles.medicalLabel} allowFontScaling={false}>
                    Аллергии
                  </Text>
                  <Text style={styles.medicalValue} allowFontScaling={false}>
                    {medicalInfo?.allergies || 'Не указано'}
                  </Text>
                </View>

                <View style={styles.medicalRow}>
                  <Text style={styles.medicalLabel} allowFontScaling={false}>
                    Медицинские заметки
                  </Text>
                  <Text style={styles.medicalValue} allowFontScaling={false}>
                    {medicalInfo?.medical_notes || 'Не указано'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  safeAreaActive: {
    backgroundColor: '#FA4B4B',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  containerActive: {
    backgroundColor: '#FA4B4B',
  },

  topBar: {
    zIndex: 5,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  topBarActive: {
    backgroundColor: '#FA4B4B',
  },

  screenTitle: {
    fontFamily: fontFamily.regular,
    color: '#262626',
  },

  screenTitleActive: {
    color: '#FFFFFF',
  },

  settingsButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mapContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EDEDED',
  },

  map: {
    width: '100%',
    height: '100%',
  },

  mapImage: {
    width: '100%',
    height: '100%',
  },

  mapFallbackOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 90,
    minHeight: 92,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  mapFallbackText: {
    marginTop: 8,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#858585',
    textAlign: 'center',
  },

  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,

    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 10,
  },

  sheetDragBlock: {
    width: '100%',
    height: SHEET_COLLAPSED_HEIGHT,
  },

  dragArea: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D7D7D7',
  },

  statusContainer: {
    width: '100%',
    height: 34,
    borderRadius: 999,
    backgroundColor: '#F6F6F6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: '#42B95C',
    marginRight: 8,
  },

  statusDotActive: {
    backgroundColor: '#FA4B4B',
  },

  statusText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#606060',
  },

  statusAccent: {
    color: '#FA4B4B',
  },

  infoTextBlock: {},

  locationText: {
    fontFamily: fontFamily.regular,
    color: '#434343',
  },

  onlineText: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    color: '#434343',
  },

  onlineAccent: {
    color: '#F05A35',
  },

  receiverDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E6E6E6',
    marginTop: 8,
    marginBottom: 8,
  },

  actionsRow: {
    flexDirection: 'row',
  },

  medicalButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#ECECEC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  medicalButtonText: {
    fontFamily: fontFamily.regular,
    color: '#5C5C5C',
  },

  callButton: {
    width: 74,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FA4B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  callButtonReceiver: {
    backgroundColor: '#ECECEC',
  },

  callButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#FFFFFF',
  },

  sosButtonOuter: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressSvg: {
    position: 'absolute',
    zIndex: 2,
  },

  sosButton: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FA4B4B',
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#FA4B4B',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },

  sosButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: '#FFFFFF',
  },

  cancelButton: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#41BF67',
    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 8,
    borderColor: '#A7E5B8',

    shadowColor: '#41BF67',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },

  cancelButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    color: '#FFFFFF',
  },

  cancelTimerText: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },

  hintText: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#A5A5A5',
  },

  sosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  sosModalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 22,
    alignItems: 'center',
  },

  sosModalIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FA4B4B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  sosModalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    color: '#262626',
    marginBottom: 8,
  },

  sosModalText: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 23,
    color: '#606060',
    textAlign: 'center',
    marginBottom: 20,
  },

  sosModalPrimaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FA4B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sosModalPrimaryText: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: '#FFFFFF',
  },

  sosModalSecondaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F6F6F6',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },

  sosModalSecondaryText: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: '#FA4B4B',
  },

  sosModalClose: {
    marginTop: 14,
  },

  sosModalCloseText: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: '#8A8A8A',
  },

  medicalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  medicalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },

  medicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  medicalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  medicalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  medicalLoadingBlock: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },

  medicalName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyL,
    color: '#262626',
    marginBottom: 14,
  },

  medicalRow: {
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    padding: 14,
    marginBottom: 10,
  },

  medicalLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.caption,
    color: '#858585',
    marginBottom: 4,
  },

  medicalValue: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    lineHeight: 21,
  },
});