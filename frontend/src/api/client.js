import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Адрес нашего сервера
// Важно: замени на свой IP если тестируешь на реальном телефоне
const BASE_URL = 'http://127.0.0.1:8000/api';

// Создаём axios клиент
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Перехватчик запросов
// Автоматически добавляет токен к каждому запросу
client.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Перехватчик ответов
// Обрабатывает ошибки автоматически
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Если токен истёк (401) — выходим из аккаунта
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
    }
    return Promise.reject(error);
  }
);

export default client;