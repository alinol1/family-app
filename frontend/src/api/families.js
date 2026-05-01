import client from './client';

// Создать семью
export const createFamily = async (name) => {
  const response = await client.post('/families/create/', { name });
  return response.data;
};

// Присоединиться к семье
export const joinFamily = async (inviteCode) => {
  const response = await client.post('/families/join/', {
    invite_code: inviteCode,
  });
  return response.data;
};

// Получить информацию о своей семье
export const getMyFamily = async () => {
  const response = await client.get('/families/my/');
  return response.data;
};

// Выйти из семьи
export const leaveFamily = async () => {
  const response = await client.post('/families/leave/');
  return response.data;
};