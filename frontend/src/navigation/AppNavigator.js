import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';

import Onboarding1Screen from '../screens/onboarding/Onboarding1Screen';
import Onboarding2Screen from '../screens/onboarding/Onboarding2Screen';
import Onboarding3Screen from '../screens/onboarding/Onboarding3Screen';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordSentScreen from '../screens/auth/ResetPasswordSentScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';

import FamilyChoiceScreen from '../screens/family/FamilyChoiceScreen';
import CreateFamilyScreen from '../screens/family/CreateFamilyScreen';
import JoinFamilyScreen from '../screens/family/JoinFamilyScreen';

import MainTabNavigator from './MainTabNavigator';

import SettingsScreen from '../screens/profile/SettingsScreen';

import DocumentsScreen from '../screens/modules/DocumentsScreen';


import FinanceScreen from '../screens/modules/FinanceScreen';
import PhotosScreen from '../screens/modules/PhotosScreen';
import FamilyTreeScreen from '../screens/modules/FamilyTreeScreen';

import DocumentListScreen from '../screens/modules/DocumentListScreen';

import DocumentViewScreen from '../screens/modules/DocumentViewScreen';

// ВАЖНО: если у тебя файл называется иначе — поменяй путь тут
import ChatDetailScreen from '../screens/main/ChatDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding1" component={Onboarding1Screen} />
        <Stack.Screen name="Onboarding2" component={Onboarding2Screen} />
        <Stack.Screen name="Onboarding3" component={Onboarding3Screen} />

        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPasswordSent" component={ResetPasswordSentScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />

        <Stack.Screen name="FamilyChoice" component={FamilyChoiceScreen} />
        <Stack.Screen name="CreateFamily" component={CreateFamilyScreen} />
        <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />

        <Stack.Screen name="MainTabs" component={MainTabNavigator} />

        <Stack.Screen name="Settings" component={SettingsScreen} />

        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />

        <Stack.Screen name="Documents" component={DocumentsScreen} />
  

        <Stack.Screen name="Finance" component={FinanceScreen} />
        <Stack.Screen name="Photos" component={PhotosScreen} />
        <Stack.Screen name="FamilyTree" component={FamilyTreeScreen} />

        <Stack.Screen name="DocumentList" component={DocumentListScreen} />
      </Stack.Navigator>
    </View>
  );
}