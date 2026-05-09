import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/main/HomeScreen';
import ChatsScreen from '../screens/main/ChatsScreen';
import SOSScreen from '../screens/main/SOSScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

import CustomTabBar from './CustomTabBar';

const Tab = createBottomTabNavigator();

function NotificationsScreen() {
  return (
    <View style={styles.placeholder}>
      <Text>Уведомления</Text>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Главная" component={HomeScreen} />
      <Tab.Screen name="Чаты" component={ChatsScreen} />
      <Tab.Screen name="SOS" component={SOSScreen} />
      <Tab.Screen name="Уведомления" component={NotificationsScreen} />
      <Tab.Screen name="Профиль" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});