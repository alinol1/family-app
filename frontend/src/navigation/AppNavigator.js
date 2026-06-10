import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
import PersonalInfoScreen from '../screens/profile/PersonalInfoScreen';
import MedicalInfoScreen from '../screens/profile/MedicalInfoScreen';
import FamilyMembersScreen from '../screens/profile/FamilyMembersScreen';
import InviteFamilyScreen from '../screens/profile/InviteFamilyScreen';

import ChatDetailScreen from '../screens/main/ChatDetailScreen';
import ChatSettingsScreen from '../screens/main/ChatSettingsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';

import DocumentsScreen from '../screens/modules/DocumentsScreen';
import DocumentListScreen from '../screens/modules/DocumentListScreen';
import DocumentViewScreen from '../screens/modules/DocumentViewScreen';

import FinanceScreen from '../screens/modules/FinanceScreen';
import FinanceGoalDetailScreen from '../screens/modules/FinanceGoalDetailScreen';
import FinanceGoalsScreen from '../screens/modules/FinanceGoalsScreen';

import PhotosScreen from '../screens/modules/PhotosScreen';
import PhotoAlbumScreen from '../screens/modules/PhotoAlbumScreen';
import PhotoViewScreen from '../screens/modules/PhotoViewScreen';

import FamilyTreeScreen from '../screens/modules/FamilyTreeScreen';
import FamilyTreePersonDetailScreen from '../screens/modules/FamilyTreePersonDetailScreen';

import { PresenceProvider } from '../context/PresenceContext';

import { getAccessToken } from '../api/tokenStorage';
import { getOnboardingCompleted } from '../api/onboardingStorage';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRouteName, setInitialRouteName] = useState('Onboarding1');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkStartRoute = async () => {
      try {
        const onboardingCompleted = await getOnboardingCompleted();

        if (!isMounted) {
          return;
        }

        if (!onboardingCompleted) {
          setIsAuthorized(false);
          setInitialRouteName('Onboarding1');
          setIsLoading(false);
          return;
        }

        const accessToken = await getAccessToken();

        if (!isMounted) {
          return;
        }

        if (accessToken) {
          setIsAuthorized(true);
          setInitialRouteName('MainTabs');
        } else {
          setIsAuthorized(false);
          setInitialRouteName('Login');
        }
      } catch (error) {
        console.log('Ошибка определения стартового экрана:', error);

        if (isMounted) {
          setIsAuthorized(false);
          setInitialRouteName('Onboarding1');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkStartRoute();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return (
    <PresenceProvider enabled={isAuthorized}>
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Onboarding1" component={Onboarding1Screen} />
          <Stack.Screen name="Onboarding2" component={Onboarding2Screen} />
          <Stack.Screen name="Onboarding3" component={Onboarding3Screen} />

          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen
                {...props}
                onLoginSuccess={() => setIsAuthorized(true)}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPasswordSent" component={ResetPasswordSentScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />

          <Stack.Screen name="FamilyChoice" component={FamilyChoiceScreen} />
          <Stack.Screen name="CreateFamily" component={CreateFamilyScreen} />
          <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />

          <Stack.Screen name="MainTabs" component={MainTabNavigator} />

          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
          <Stack.Screen name="MedicalInfo" component={MedicalInfoScreen} />
          <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} />
          <Stack.Screen name="InviteFamily" component={InviteFamilyScreen} />

          <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
          <Stack.Screen name="ChatSettings" component={ChatSettingsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />

          <Stack.Screen name="Documents" component={DocumentsScreen} />
          <Stack.Screen name="DocumentList" component={DocumentListScreen} />
          <Stack.Screen name="DocumentView" component={DocumentViewScreen} />

          <Stack.Screen name="Finance" component={FinanceScreen} />
          <Stack.Screen name="FinanceGoalDetail" component={FinanceGoalDetailScreen} />
          <Stack.Screen name="FinanceGoals" component={FinanceGoalsScreen} />

          <Stack.Screen name="Photos" component={PhotosScreen} />
          <Stack.Screen name="PhotoAlbum" component={PhotoAlbumScreen} />
          <Stack.Screen name="PhotoView" component={PhotoViewScreen} />

          <Stack.Screen name="FamilyTree" component={FamilyTreeScreen} />
          <Stack.Screen
            name="FamilyTreePersonDetail"
            component={FamilyTreePersonDetailScreen}
          />
        </Stack.Navigator>
      </View>
    </PresenceProvider>
  );
}