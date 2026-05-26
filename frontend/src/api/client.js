import axios from 'axios';

import { API_BASE_URL } from '../config/api';

import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveTokens,
  clearTokens,
} from './tokenStorage';

export const BASE_URL = API_BASE_URL;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

client.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      await clearTokens();
      return Promise.reject(error);
    }

    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      await clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newAccessToken) => {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(originalRequest);
        })
        .catch((queueError) => Promise.reject(queueError));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await axios.post(`${BASE_URL}auth/token/refresh/`, {
        refresh: refreshToken,
      });

      const newAccessToken = response.data.access;
      const newRefreshToken = response.data.refresh;

      if (!newAccessToken) {
        throw new Error('Сервер не вернул новый access token');
      }

      if (newRefreshToken) {
        await saveTokens(newAccessToken, newRefreshToken);
      } else {
        await saveAccessToken(newAccessToken);
      }

      client.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      processQueue(null, newAccessToken);

      return client(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await clearTokens();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;