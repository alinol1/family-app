import client from './client';

// Отправить SOS
export const sendSOS = async (latitude, longitude, address) => {
  const response = await client.post('/sos/send/', {
    latitude,
    longitude,
    address,
  });
  return response.data;
};

// Активный сигнал
export const getActiveSOS = async () => {
  const response = await client.get('/sos/active/');
  return response.data;
};

// Подтвердить получение
export const confirmSOS = async (signalId) => {
  const response = await client.post(`/sos/${signalId}/confirm/`);
  return response.data;
};

// Отменить сигнал
export const cancelSOS = async (signalId) => {
  const response = await client.post(`/sos/${signalId}/cancel/`);
  return response.data;
};

// История
export const getSOSHistory = async () => {
  const response = await client.get('/sos/history/');
  return response.data;
};