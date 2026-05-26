import client from './client';

export const getChats = async () => {
  const response = await client.get('/chat/');
  return response.data;
};

export const createChat = async (data) => {
  if (data?.user_ids) {
    const response = await client.post('/chat/group/', {
      title: data.chat_name || 'Групповой чат',
      member_ids: data.user_ids,
    });

    return response.data;
  }

  const response = await client.post('/chat/create/', {
    user_id: data?.user_id || data,
  });

  return response.data;
};

export const deleteChat = async (chatId) => {
  const response = await client.delete(`/chat/${chatId}/`);
  return response.data;
};

export const getChat = async (chatId) => {
  const response = await client.get(`/chat/${chatId}/`);
  return response.data;
};

export const updateChat = async (chatId, data) => {
  const response = await client.patch(`/chat/${chatId}/`, data);
  return response.data;
};

export const getChatSettings = async (chatId) => {
  const response = await client.get(`/chat/${chatId}/settings/`);
  return response.data;
};

export const addChatMembers = async (chatId, memberIds) => {
  const response = await client.post(`/chat/${chatId}/members/`, {
    member_ids: memberIds,
  });

  return response.data;
};

export const removeChatMember = async (chatId, userId) => {
  const response = await client.delete(`/chat/${chatId}/members/${userId}/`);
  return response.data;
};

export const getMessages = async (chatId) => {
  const response = await client.get(`/chat/${chatId}/messages/`);
  return response.data;
};

export const sendMessage = async (chatId, text) => {
  const response = await client.post(`/chat/${chatId}/send/`, {
    text,
  });

  return response.data;
  
};

export const uploadChatPhoto = async (chatId, image) => {
  const fileName =
    image.fileName ||
    image.uri?.split('/').pop() ||
    `chat_${chatId}.jpg`;

  const fileType =
    image.mimeType ||
    image.type ||
    'image/jpeg';

  const formData = new FormData();

  formData.append('photo', {
    uri: image.uri,
    name: fileName,
    type: fileType,
  });

  const response = await client.patch(
    `/chat/${chatId}/photo/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

export const deleteChatPhoto = async (chatId) => {
  const response = await client.delete(`/chat/${chatId}/photo/`);
  return response.data;
};