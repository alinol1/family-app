import client from './client';

// Категории
export const getFinanceCategories = async (type = null) => {
  const response = await client.get('/finance/categories/', {
    params: type ? { type } : {},
  });

  return response.data;
};

export const createFinanceCategory = async ({ title, type }) => {
  const response = await client.post('/finance/categories/', {
    title,
    type,
  });

  return response.data;
};

export const updateFinanceCategory = async (categoryId, data) => {
  const response = await client.patch(`/finance/categories/${categoryId}/`, data);
  return response.data;
};

export const deleteFinanceCategory = async (categoryId) => {
  const response = await client.delete(`/finance/categories/${categoryId}/`);
  return response.data;
};

// Операции
export const getFinanceRecords = async (type = null) => {
  const response = await client.get('/finance/records/', {
    params: type ? { type } : {},
  });

  return response.data;
};

export const createFinanceRecord = async ({
  type,
  amount,
  category,
  categoryTitle,
  description,
  date,
}) => {
  const payload = {
    type,
    amount,
    description,
    date,
  };

  if (category) {
    payload.category = category;
  }

  if (categoryTitle) {
    payload.category_title = categoryTitle;
  }

  const response = await client.post('/finance/records/', payload);
  return response.data;
};

export const updateFinanceRecord = async (recordId, data) => {
  const response = await client.patch(`/finance/records/${recordId}/`, data);
  return response.data;
};

export const deleteFinanceRecord = async (recordId) => {
  const response = await client.delete(`/finance/records/${recordId}/`);
  return response.data;
};

// Цель
export const getFinanceGoal = async () => {
  const response = await client.get('/finance/goal/');
  return response.data;
};

export const updateFinanceGoal = async ({
  title,
  currentAmount,
  targetAmount,
}) => {
  const response = await client.patch('/finance/goal/', {
    title,
    current_amount: currentAmount,
    target_amount: targetAmount,
  });

  return response.data;
};

// Сводка и статистика
export const getFinanceSummary = async () => {
  const response = await client.get('/finance/summary/');
  return response.data;
};

export const getFinanceStatistics = async () => {
  const response = await client.get('/finance/statistics/');
  return response.data;
};