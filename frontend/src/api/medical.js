import client from './client';

export const getMedicalInfo = async (userId = null) => {
  const url = userId
    ? `/auth/medical-info/${userId}/`
    : '/auth/medical-info/';

  const response = await client.get(url);
  return response.data;
};