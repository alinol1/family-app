import * as SecureStore from 'expo-secure-store';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export async function setOnboardingCompleted() {
  await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, 'true');
}

export async function getOnboardingCompleted() {
  const value = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
  return value === 'true';
}

export async function clearOnboardingCompleted() {
  await SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY);
}