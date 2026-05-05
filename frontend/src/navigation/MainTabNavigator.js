import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/main/HomeScreen';
import ChatsScreen from '../screens/main/ChatsScreen';
import SOSScreen from '../screens/main/SOSScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CustomTabBar from './CustomTabBar';

const Tab = createBottomTabNavigator();

// Временный экран уведомлений
function NotificationsScreen() {
  const { View, Text } = require('react-native');
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 24, color: '#313131' }}>Уведомления</Text>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Главная" component={HomeScreen} />
      <Tab.Screen name="Чаты" component={ChatsScreen} />
      <Tab.Screen name="SOS" component={SOSScreen} />
      <Tab.Screen name="Уведомления" component={NotificationsScreen} />
      <Tab.Screen name="Профиль" component={ProfileScreen} />
    </Tab.Navigator>
  );
}