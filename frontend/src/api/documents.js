import client from './client';

export const getFamilyDocuments = async (search = '') => {
  const response = await client.get('/documents/family/', {
    params: { search },
  });

  return response.data;
};

export const getMyDocuments = async (search = '') => {
  const response = await client.get('/documents/my/', {
    params: { search },
  });

  return response.data;
};

export const getSharedDocuments = async (ownerId = null, search = '') => {
  const response = await client.get('/documents/shared/', {
    params: {
      owner_id: ownerId,
      search,
    },
  });

  return response.data;
};

export const getSharedOwners = async () => {
  const response = await client.get('/documents/shared-owners/');
  return response.data;
};

export const getDocumentFamilyMembers = async () => {
  const response = await client.get('/documents/family-members/');
  return response.data;
};

export const getDocumentById = async (documentId) => {
  const response = await client.get(`/documents/${documentId}/`);
  return response.data;
};

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

export const updateDocument = async (documentId, data) => {
  const response = await client.patch(`/documents/${documentId}/`, data);
  return response.data;
};

export const deleteDocument = async (documentId) => {
  const response = await client.delete(`/documents/${documentId}/`);
  return response.data;
};