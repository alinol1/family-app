import client from './client';

export const getFinanceFamilyMembers = async () => {
  const response = await client.get('/finance/family-members/');
  return response.data;
};

export const getFinanceSpaces = async () => {
  const response = await client.get('/finance/spaces/');
  return response.data;
};

export const createFinanceSpace = async ({
  title,
  type = 'joint',
  memberIds = [],
}) => {
  const response = await client.post('/finance/spaces/', {
    title,
    type,
    member_ids: memberIds,
  });

  return response.data;
};

export const getFinanceSpaceById = async (spaceId) => {
  const response = await client.get(`/finance/spaces/${spaceId}/`);
  return response.data;
};

export const updateFinanceSpace = async (spaceId, data) => {
  const response = await client.patch(`/finance/spaces/${spaceId}/`, data);
  return response.data;
};

export const deleteFinanceSpace = async (spaceId) => {
  const response = await client.delete(`/finance/spaces/${spaceId}/`);
  return response.data;
};

export const getFinanceSpaceMembers = async (spaceId) => {
  const response = await client.get(`/finance/spaces/${spaceId}/members/`);
  return response.data;
};

export const updateFinanceSpaceMembers = async (spaceId, memberIds) => {
  const response = await client.put(`/finance/spaces/${spaceId}/members/`, {
    member_ids: memberIds,
  });

  return response.data;
};

export const getFinanceSummary = async (spaceId) => {
  const response = await client.get(`/finance/spaces/${spaceId}/summary/`);
  return response.data;
};

export const getFinanceStatistics = async (spaceId) => {
  const response = await client.get(`/finance/spaces/${spaceId}/statistics/`);
  return response.data;
};

export const getFinanceCategories = async (spaceId, type = null) => {
  const response = await client.get(`/finance/spaces/${spaceId}/categories/`, {
    params: type ? { type } : {},
  });

  return response.data;
};

export const createFinanceCategory = async ({ spaceId, title, type }) => {
  const response = await client.post(`/finance/spaces/${spaceId}/categories/`, {
    title,
    type,
  });

  return response.data;
};

export const updateFinanceCategory = async (spaceId, categoryId, data) => {
  const response = await client.patch(
    `/finance/spaces/${spaceId}/categories/${categoryId}/`,
    data
  );

  return response.data;
};

export const deleteFinanceCategory = async (spaceId, categoryId) => {
  const response = await client.delete(
    `/finance/spaces/${spaceId}/categories/${categoryId}/`
  );

  return response.data;
};

export const getFinanceRecords = async (spaceId, type = null) => {
  const response = await client.get(`/finance/spaces/${spaceId}/records/`, {
    params: type ? { type } : {},
  });

  return response.data;
};

export const createFinanceRecord = async ({
  spaceId,
  type,
  amount,
  title,
  category = null,
  categoryTitle = '',
  description = '',
  date = null,
}) => {
  const payload = {
    type,
    amount,
    title,
    description,
  };

  if (date) {
    payload.date = date;
  }

  if (category) {
    payload.category = category;
  }

  if (categoryTitle) {
    payload.category_title = categoryTitle;
  }

  const response = await client.post(
    `/finance/spaces/${spaceId}/records/`,
    payload
  );

  return response.data;
};

export const getFinanceRecordById = async (spaceId, recordId) => {
  const response = await client.get(
    `/finance/spaces/${spaceId}/records/${recordId}/`
  );

  return response.data;
};

export const updateFinanceRecord = async (spaceId, recordId, data) => {
  const response = await client.patch(
    `/finance/spaces/${spaceId}/records/${recordId}/`,
    data
  );

  return response.data;
};

export const deleteFinanceRecord = async (spaceId, recordId) => {
  const response = await client.delete(
    `/finance/spaces/${spaceId}/records/${recordId}/`
  );

  return response.data;
};

export const getFinanceGoals = async (spaceId, status = null) => {
  const response = await client.get(`/finance/spaces/${spaceId}/goals/`, {
    params: status ? { status } : {},
  });

  return response.data;
};

export const createFinanceGoal = async ({
  spaceId,
  title,
  description = '',
  scope = 'personal',
  targetAmount,
  memberIds = [],
}) => {
  const response = await client.post(`/finance/spaces/${spaceId}/goals/`, {
    title,
    description,
    scope,
    target_amount: targetAmount,
    member_ids: memberIds,
  });

  return response.data;
};

export const getFinanceGoalById = async (spaceId, goalId) => {
  const response = await client.get(
    `/finance/spaces/${spaceId}/goals/${goalId}/`
  );

  return response.data;
};

export const updateFinanceGoal = async (spaceId, goalId, data) => {
  const response = await client.patch(
    `/finance/spaces/${spaceId}/goals/${goalId}/`,
    data
  );

  return response.data;
};

export const deleteFinanceGoal = async (spaceId, goalId) => {
  const response = await client.delete(
    `/finance/spaces/${spaceId}/goals/${goalId}/`
  );

  return response.data;
};

export const completeFinanceGoal = async (spaceId, goalId) => {
  const response = await client.post(
    `/finance/spaces/${spaceId}/goals/${goalId}/complete/`
  );

  return response.data;
};

export const getFinanceGoalContributions = async (spaceId, goalId) => {
  const response = await client.get(
    `/finance/spaces/${spaceId}/goals/${goalId}/contributions/`
  );

  return response.data;
};

export const createFinanceGoalContribution = async ({
  spaceId,
  goalId,
  amount,
  comment = '',
}) => {
  const response = await client.post(
    `/finance/spaces/${spaceId}/goals/${goalId}/contributions/`,
    {
      amount,
      comment,
    }
  );

  return response.data;
};