import client from './client';

export const getActivityOverview = async () => {
  const response = await client.get('/activity/');
  return response.data;
};

export const createFamilyTask = async (title) => {
  const response = await client.post('/activity/tasks/', {
    title,
  });

  return response.data;
};

export const updateFamilyTask = async (taskId, data) => {
  const response = await client.patch(`/activity/tasks/${taskId}/`, data);
  return response.data;
};

export const deleteFamilyTask = async (taskId) => {
  const response = await client.delete(`/activity/tasks/${taskId}/`);
  return response.data;
};

export const createShoppingItem = async (title) => {
  const response = await client.post('/activity/shopping/', {
    title,
  });

  return response.data;
};

export const updateShoppingItem = async (itemId, data) => {
  const response = await client.patch(`/activity/shopping/${itemId}/`, data);
  return response.data;
};

export const deleteShoppingItem = async (itemId) => {
  const response = await client.delete(`/activity/shopping/${itemId}/`);
  return response.data;
};