import client from './client';

import {
  saveTokens,
  getRefreshToken,
  clearTokens,
  hasTokens,
} from './tokenStorage';

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

  await saveTokens(response.data.access, response.data.refresh);

  return response.data;
};

// Выход
export const logout = async () => {
  const refresh = await getRefreshToken();

  try {
    if (refresh) {
      await client.post('/auth/logout/', { refresh });
    }
  } catch (error) {
    // Даже если сервер не ответил — всё равно удаляем токены на устройстве
  }

  await clearTokens();
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
  return hasTokens();
};

// Запросить сброс пароля
export const requestPasswordReset = async (email) => {
  const response = await client.post('/auth/password-reset/', { email });
  return response.data;
};

// Проверить код сброса
export const verifyPasswordResetCode = async (email, code) => {
  const response = await client.post('/auth/password-reset/verify/', {
    email,
    code,
  });

  return response.data;
};

export const uploadProfileAvatar = async (image) => {
  const fileName =
    image.fileName ||
    image.uri?.split('/').pop() ||
    'avatar.jpg';

  const fileType =
    image.mimeType ||
    'image/jpeg';

  const formData = new FormData();

  formData.append('avatar', {
    uri: image.uri,
    name: fileName,
    type: fileType,
  });

  const response = await client.patch(
    '/auth/profile/avatar/',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

// Подтвердить новый пароль
export const confirmPasswordReset = async (
  email,
  code,
  newPassword,
  newPassword2
) => {
  const response = await client.post('/auth/password-reset/confirm/', {
    email,
    code,
    new_password: newPassword,
    new_password2: newPassword2,
  });

  return response.data;
};


export const deleteAccount = async () => {
  const response = await client.delete('/auth/account/');
  await clearTokens();
  return response.data;
};