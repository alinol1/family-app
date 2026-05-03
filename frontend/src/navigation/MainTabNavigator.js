import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/main/HomeScreen';
import ChatsScreen from '../screens/main/ChatsScreen';
import SOSScreen from '../screens/main/SOSScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { colors } from '../utils/colors';

const Tab = createBottomTabNavigator();

function SOSButton({ children, onPress }) {
  return (
    <TouchableOpacity style={styles.sosButtonWrapper} onPress={onPress}>
      <View style={styles.sosButton}>{children}</View>
    </TouchableOpacity>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Главная') iconName = 'home-outline';
          if (route.name === 'Чаты') iconName = 'chatbubble-ellipses-outline';
          if (route.name === 'SOS') iconName = 'warning-outline';
          if (route.name === 'Профиль') iconName = 'person-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Главная" component={HomeScreen} />
      <Tab.Screen name="Чаты" component={ChatsScreen} />
      <Tab.Screen
        name="SOS"
        component={SOSScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning-outline" size={26} color={colors.textOnPrimary} />
          ),
          tabBarButton: (props) => <SOSButton {...props} />,
        }}
      />
      <Tab.Screen name="Профиль" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: 96,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
    paddingBottom: 24,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  sosButtonWrapper: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
});