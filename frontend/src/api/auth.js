import client from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Регистрация
export const register = async (userData) => {
  const response = await client.post('/auth/register/', userData);
  return response.data;
};

// Вход
export const login = async (username, password) => {
  const response = await client.post('/auth/login/', {
    username,
    password,
  });

  // Сохраняем токены
  await AsyncStorage.setItem('access_token', response.data.access);
  await AsyncStorage.setItem('refresh_token', response.data.refresh);

  return response.data;
};

// Выход
export const logout = async () => {
  const refresh = await AsyncStorage.getItem('refresh_token');
  try {
    await client.post('/auth/logout/', { refresh });
  } catch (e) {
    // Даже если сервер не ответил — всё равно удаляем токены
  }
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
};

// Получить профиль
export const getProfile = async () => {
  const response = await client.get('/auth/profile/');
  return response.data;
};

// Обновить профиль
export const updateProfile = async (data) => {
  const response = await client.put('/auth/profile/', data);
  return response.data;
};

// Проверить авторизован ли пользователь
export const isAuthenticated = async () => {
  const token = await AsyncStorage.getItem('access_token');
  return !!token;
};