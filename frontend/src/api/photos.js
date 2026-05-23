import client from './client';

// Получить все фотоальбомы семьи
export const getPhotoAlbums = async () => {
  const response = await client.get('/photos/albums/');
  return response.data;
};

// Создать фотоальбом
export const createPhotoAlbum = async (title) => {
  const response = await client.post('/photos/albums/', {
    title: title || 'Новый альбом',
  });

  return response.data;
};

// Получить один альбом
export const getPhotoAlbumById = async (albumId) => {
  if (!albumId) {
    throw new Error('ID альбома обязателен');
  }

  const response = await client.get(`/photos/albums/${albumId}/`);
  return response.data;
};

// Обновить альбом
export const updatePhotoAlbum = async (albumId, data) => {
  if (!albumId) {
    throw new Error('ID альбома обязателен');
  }

  const response = await client.patch(`/photos/albums/${albumId}/`, data);
  return response.data;
};

// Удалить альбом
export const deletePhotoAlbum = async (albumId) => {
  if (!albumId) {
    throw new Error('ID альбома обязателен');
  }

  const response = await client.delete(`/photos/albums/${albumId}/`);
  return response.data;
};

// Получить фотографии конкретного альбома
export const getAlbumPhotos = async (albumId) => {
  if (!albumId) {
    throw new Error('ID альбома обязателен');
  }

  const response = await client.get(`/photos/albums/${albumId}/photos/`);
  return response.data;
};

// Загрузить фотографию в альбом
export const uploadAlbumPhoto = async ({
  albumId,
  title,
  image,
}) => {
  if (!albumId) {
    throw new Error('ID альбома обязателен');
  }

  if (!image) {
    throw new Error('Фотография обязательна');
  }

  const formData = new FormData();

  formData.append('title', title || 'Фотография');
  formData.append('image', image);

  const response = await client.post(
    `/photos/albums/${albumId}/photos/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

// Получить одну фотографию
export const getPhotoById = async (photoId) => {
  if (!photoId) {
    throw new Error('ID фотографии обязателен');
  }

  const response = await client.get(`/photos/photo/${photoId}/`);
  return response.data;
};

// Обновить фотографию
export const updatePhoto = async (photoId, data) => {
  if (!photoId) {
    throw new Error('ID фотографии обязателен');
  }

  const response = await client.patch(`/photos/photo/${photoId}/`, data);
  return response.data;
};

// Удалить фотографию
export const deletePhoto = async (photoId) => {
  if (!photoId) {
    throw new Error('ID фотографии обязателен');
  }

  const response = await client.delete(`/photos/photo/${photoId}/`);
  return response.data;
};