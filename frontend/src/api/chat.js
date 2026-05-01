import client from './client';

// Список чатов
export const getChats = async () => {
  const response = await client.get('/chat/');
  return response.data;
};

// Создать личный чат
export const createChat = async (userId) => {
  const response = await client.post('/chat/create/', { user_id: userId });
  return response.data;
};

// Получить сообщения
export const getMessages = async (chatId) => {
  const response = await client.get(`/chat/${chatId}/messages/`);
  return response.data;
};

// Отправить сообщение
export const sendMessage = async (chatId, text) => {
  const response = await client.post(`/chat/${chatId}/send/`, { text });
  return response.data;
};