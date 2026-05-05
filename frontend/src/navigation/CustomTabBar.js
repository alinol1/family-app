import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CENTER_INDEX = 2;

const TABS = [
  { name: 'Главная', icon: 'home-outline', activeIcon: 'home' },
  { name: 'Чаты', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { name: 'SOS', icon: 'warning-outline', activeIcon: 'warning' },
  { name: 'Уведомления', icon: 'notifications-outline', activeIcon: 'notifications' },
  { name: 'Профиль', icon: 'person-outline', activeIcon: 'person' },
];

function getMetrics(screenWidth) {
  const isSmall = screenWidth < 360;

  return {
    tabBarHeight: isSmall ? 88 : 98,
    paddingTop: isSmall ? 24 : 30,
    centerButtonSize: isSmall ? 62 : 72,
    centerButtonMarginTop: isSmall ? -16 : -20,
    activeCircleSize: isSmall ? 44 : 52,
    iconSize: isSmall ? 24 : 28,
    centerIconSize: isSmall ? 22 : 26,
    baseTopY: isSmall ? 18 : 22,
    wavePeakY: 0,
    waveWidth: isSmall ? 90 : 110,
  };
}

function getWavePath(width, height, metrics) {
  const centerX = width / 2;
  const waveLeft = centerX - metrics.waveWidth / 2;
  const waveRight = centerX + metrics.waveWidth / 2;

  return `
    M 0 ${metrics.baseTopY}
    L ${waveLeft} ${metrics.baseTopY}
    C ${waveLeft + 14} ${metrics.baseTopY}, ${centerX - 28} ${metrics.wavePeakY}, ${centerX} ${metrics.wavePeakY}
    C ${centerX + 28} ${metrics.wavePeakY}, ${waveRight - 14} ${metrics.baseTopY}, ${waveRight} ${metrics.baseTopY}
    L ${width} ${metrics.baseTopY}
    L ${width} ${height}
    L 0 ${height}
    Z
  `;
}

export default function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const m = getMetrics(screenWidth);
  const totalHeight = m.tabBarHeight + insets.bottom;

  const currentIndex = state.index;
  const showCircle = currentIndex !== CENTER_INDEX;

  const [tabPositions, setTabPositions] = useState({});
  const translateX = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);
  const tabRefs = useRef({});
  const rowRef = useRef(null);
  const [rowOffset, setRowOffset] = useState(null);

  // Замеряем позицию tabsRow
  const onRowLayout = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.measureInWindow((x, y) => {
        setRowOffset({ x, y });
      });
    }
  }, []);

  // Замеряем позиции иконок
  const measureTab = useCallback((index) => {
    const ref = tabRefs.current[index];
    if (!ref || !rowOffset) return;

    ref.measureInWindow((x, y, width, height) => {
      if (x === undefined) return;

      // Позиция относительно контейнера
      const relativeX = x + width / 2 - m.activeCircleSize / 2;

      setTabPositions((prev) => {
        if (prev[index] === relativeX) return prev;
        return { ...prev, [index]: relativeX };
      });
    });
  }, [rowOffset, m.activeCircleSize]);

  // Перезамеряем все табы когда rowOffset готов
  useEffect(() => {
    if (!rowOffset) return;

    const timer = setTimeout(() => {
      Object.keys(tabRefs.current).forEach((index) => {
        measureTab(Number(index));
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [rowOffset, measureTab]);

  // Начальная позиция без анимации
  useEffect(() => {
    const targetX = tabPositions[currentIndex];
    if (targetX !== undefined && isFirstRender.current) {
      translateX.setValue(targetX);
      isFirstRender.current = false;
    }
  }, [tabPositions]);

  // Анимация при переключении
  useEffect(() => {
    const targetX = tabPositions[currentIndex];
    if (targetX === undefined || isFirstRender.current) return;

    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      damping: 18,
      mass: 0.8,
      stiffness: 150,
      overshootClamping: false,
    }).start();
  }, [currentIndex, tabPositions]);

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      <Svg
        width={screenWidth}
        height={totalHeight}
        style={StyleSheet.absoluteFill}
      >
        <Path
          d={getWavePath(screenWidth, totalHeight, m)}
          fill="#F7F7F7"
        />
      </Svg>

      {/* Плавающий кружок */}
      {showCircle && (
        <Animated.View
          style={[
            styles.floatingCircle,
            {
              top: m.paddingTop,
              width: m.activeCircleSize,
              height: m.activeCircleSize,
              borderRadius: m.activeCircleSize / 2,
              transform: [{ translateX }],
            },
          ]}
        />
      )}

      <View
        ref={rowRef}
        style={[styles.tabsRow, { paddingTop: m.paddingTop, height: m.tabBarHeight }]}
        onLayout={onRowLayout}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter = index === CENTER_INDEX;
          const tab = TABS[index];

          const onPress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <View
                key={route.key}
                ref={(ref) => { tabRefs.current[index] = ref; }}
                style={[
                  styles.centerButtonWrapper,
                  { marginTop: m.centerButtonMarginTop },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.centerButton,
                    {
                      width: m.centerButtonSize,
                      height: m.centerButtonSize,
                      borderRadius: m.centerButtonSize / 2,
                      backgroundColor: isFocused ? '#E96847' : '#9452FE',
                    },
                  ]}
                  onPress={onPress}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isFocused ? tab.activeIcon : tab.icon}
                    size={m.centerIconSize}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              ref={(ref) => { tabRefs.current[index] = ref; }}
              style={[
                styles.tabButton,
                {
                  width: m.activeCircleSize,
                  height: m.activeCircleSize,
                },
              ]}
              onPress={onPress}
              activeOpacity={1}
            >
              <Ionicons
                name={isFocused ? tab.activeIcon : tab.icon}
                size={m.iconSize}
                color={isFocused ? '#FFFFFF' : '#7B7B7B'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  floatingCircle: {
    position: 'absolute',
    left: 0,
    backgroundColor: '#C39EFF',
  },

  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-evenly',
  },

  tabButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});