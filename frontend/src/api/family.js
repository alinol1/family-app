import client from './client';

export const getMyFamily = async () => {
  const response = await client.get('/families/my/');
  return response.data;
};