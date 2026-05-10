import client from './client';

// Общие документы семьи
export const getFamilyDocuments = async (search = '') => {
  const response = await client.get('/documents/family/', {
    params: { search },
  });

  return response.data;
};

// Личные документы текущего пользователя
export const getMyDocuments = async (search = '') => {
  const response = await client.get('/documents/my/', {
    params: { search },
  });

  return response.data;
};

// Документы, доступные мне
export const getSharedDocuments = async (ownerId = null, search = '') => {
  const response = await client.get('/documents/shared/', {
    params: {
      owner_id: ownerId,
      search,
    },
  });

  return response.data;
};

// Люди, которые предоставили мне доступ
export const getSharedOwners = async () => {
  const response = await client.get('/documents/shared-owners/');
  return response.data;
};

// Один документ
export const getDocumentById = async (documentId) => {
  const response = await client.get(`/documents/${documentId}/`);
  return response.data;
};

// Загрузка документа
export const uploadDocument = async ({
  title,
  file,
  docType = 'other',
  isFamilyDoc = false,
}) => {
  const formData = new FormData();

  formData.append('title', title);
  formData.append('doc_type', docType);
  formData.append('is_family_doc', String(isFamilyDoc));
  formData.append('file', file);

  const response = await client.post('/documents/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Обновить документ
export const updateDocument = async (documentId, data) => {
  const response = await client.patch(`/documents/${documentId}/`, data);
  return response.data;
};

// Удалить документ
export const deleteDocument = async (documentId) => {
  const response = await client.delete(`/documents/${documentId}/`);
  return response.data;
};