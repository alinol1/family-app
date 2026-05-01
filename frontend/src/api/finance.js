import client from './client';

// Категории
export const getCategories = async (type) => {
  const response = await client.get('/finance/categories/', {
    params: { type },
  });
  return response.data;
};

// Все записи
export const getRecords = async () => {
  const response = await client.get('/finance/records/');
  return response.data;
};

// Добавить запись
export const addRecord = async (data) => {
  const response = await client.post('/finance/records/', data);
  return response.data;
};

// Баланс семьи
export const getBalance = async () => {
  const response = await client.get('/finance/balance/');
  return response.data;
};

// Статистика
export const getStatistics = async () => {
  const response = await client.get('/finance/statistics/');
  return response.data;
};

// Семейная цель
export const getGoal = async () => {
  const response = await client.get('/finance/goal/');
  return response.data;
};

// Создать цель
export const createGoal = async (data) => {
  const response = await client.post('/finance/goal/', data);
  return response.data;
};