import client from './client';

export const getFamilyPresence = async () => {
  const response = await client.get('/auth/presence/family/');
  return response.data;
};