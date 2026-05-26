import client from './client';

export const getFamilyTree = async () => {
  const response = await client.get('/tree/');
  return response.data;
};

export const createTreePerson = async (data) => {
  const response = await client.post('/tree/persons/', data);
  return response.data;
};

export const updateTreePerson = async (personId, data) => {
  const response = await client.patch(`/tree/persons/${personId}/`, data);
  return response.data;
};

export const deleteTreePerson = async (personId) => {
  const response = await client.delete(`/tree/persons/${personId}/`);
  return response.data;
};

export const addTreeRelative = async (personId, data) => {
  const response = await client.post(
    `/tree/persons/${personId}/add-relative/`,
    data
  );

  return response.data;
};

export const updateTreePersonLabel = async (personId, label) => {
  const response = await client.patch(`/tree/persons/${personId}/label/`, {
    label,
  });

  return response.data;
};

export const uploadTreePersonPhoto = async (personId, image) => {
  const fileName =
    image.fileName ||
    image.uri?.split('/').pop() ||
    `family_tree_person_${personId}.jpg`;

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
    `/tree/persons/${personId}/photo/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

export const deleteTreePersonPhoto = async (personId) => {
  const response = await client.delete(`/tree/persons/${personId}/photo/`);
  return response.data;
};