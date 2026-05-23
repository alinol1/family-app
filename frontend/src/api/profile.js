import client from './client';

export const getProfile = async () => {
  const response = await client.get('/auth/profile/');
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await client.patch('/auth/profile/', data);
  return response.data;
};

export const updateProfileWithAvatar = async (formData) => {
  const response = await client.patch('/auth/profile/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};