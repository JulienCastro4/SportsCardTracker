import axios from 'axios';
import { Card } from '../types';
import { useAuth0 } from '@auth0/auth0-react';

const API_URL = 'http://localhost:3001/api';

// Create a function to get the Auth0 user ID
export const getUserId = (): string => {
  // Try to get the user ID from localStorage
  const user = JSON.parse(localStorage.getItem('auth0User') || '{}');
  return user.sub || 'anonymous-user';
};

// Set up axios with default headers
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add an interceptor to include the user ID in every request
api.interceptors.request.use(
  (config) => {
    // Add the user ID to the headers
    config.headers['x-user-id'] = getUserId();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getCards = async (): Promise<Card[]> => {
  const response = await api.get('/cards');
  return response.data;
};

export const getCard = async (id: number): Promise<Card> => {
  const response = await api.get(`/cards/${id}`);
  return response.data;
};

export const createCard = async (card: Omit<Card, 'id'>): Promise<Card> => {
  const response = await api.post('/cards', card);
  return response.data;
};

export const updateCard = async (id: number, card: Partial<Card>): Promise<Card> => {
  const response = await api.put(`/cards/${id}`, card);
  return response.data;
};

export const deleteCard = async (id: number): Promise<void> => {
  await api.delete(`/cards/${id}`);
};

export default api; 