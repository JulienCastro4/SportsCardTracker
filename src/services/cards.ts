import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useMemo } from 'react';
import { Card as CardType } from '../types';

export interface Card {
  id: number;
  name: string;
  price: number;
  soldPrice?: number;
  imageUrl: string;
  status: 'bought' | 'sold';
  boughtDate?: string;
  soldDate?: string;
  description?: string;
  condition?: string;
  category?: string;
  collectionId?: number;
  userId: string;
  createdAt: string;
  graded: boolean | number;
  gradingCompany?: 'PSA' | 'BGS';
  gradingValue?: number;
}

export interface CardStats {
  totalInvestment: number;
  boughtInvestment: number;
  soldInvestment: number;
  totalSold: number;
  cardsBought: number;
  cardsSold: number;
  profit: number;
  profitsByCategory?: Record<string, { 
    totalProfit: number;
    totalSold: number;
    count: number;
    averageProfit: number;
  }>;
  investmentsByCategory?: Record<string, {
    totalInvestment: number;
    count: number;
    averageInvestment: number;
  }>;
  roiByCategory?: Record<string, {
    totalProfit: number;
    totalInvestment: number;
    count: number;
    roi: number;
  }>;
  salesByMonth?: Record<string, {
    totalSales: number;
    count: number;
    totalProfit: number;
  }>;
  topMonths?: Array<[string, {
    totalSales: number;
    count: number;
    totalProfit: number;
  }]>;
  topCategories?: Array<[string, {
    totalProfit: number;
    totalSold: number;
    count: number;
    averageProfit: number;
  }]>;
  topInvestmentCategories?: Array<[string, {
    totalInvestment: number;
    count: number;
    averageInvestment: number;
  }]>;
  topRoiCategories?: Array<[string, {
    totalProfit: number;
    totalInvestment: number;
    count: number;
    roi: number;
  }]>;
}

export const useCardsService = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const baseURL = 'http://localhost:3001/api';

  const getHeaders = async () => {
    try {
      const token = await getAccessTokenSilently();
      
      if (!user?.sub) {
        // Use a fallback user ID if the real one is not available
        return {
          Authorization: `Bearer ${token}`,
          'x-user-id': 'anonymous-user',
        };
      } else {
        return {
          Authorization: `Bearer ${token}`,
          'x-user-id': user.sub,
        };
      }
    } catch (error) {
      // Return basic headers with a fallback user ID if token fails
      return {
        'x-user-id': user?.sub || 'anonymous-user',
      };
    }
  };

  return useMemo(() => {
    const getUserId = async (): Promise<string> => {
      if (!user?.sub) {
        throw new Error('User not authenticated');
      }
      return user.sub;
    };

    const getAllCards = async (collectionId?: number): Promise<Card[]> => {
      try {
        const headers = await getHeaders();
        // Si c'est la collection principale (id=1), on récupère toutes les cartes
        const url = collectionId === 1
          ? `${baseURL}/cards?userOnly=true` // Récupère toutes les cartes de l'utilisateur
          : collectionId 
            ? `${baseURL}/cards?collectionId=${collectionId}&userOnly=true` // Filtre par collection spécifique
            : `${baseURL}/cards?userOnly=true`; // Récupère toutes les cartes par défaut
        
        const response = await axios.get(url, { headers });
        // Convertir les prix en nombres
        return response.data.map((card: any) => ({
          ...card,
          price: Number(card.price) || 0,
          soldPrice: card.soldPrice ? Number(card.soldPrice) : undefined
        }));
      } catch (error) {
        console.error('Error in getAllCards:', error);
        // Return empty array on error
        return [];
      }
    };

    // Récupérer les cartes pour toutes les collections (pour les statistiques)
    const getAllCardsForStats = async (): Promise<Card[]> => {
      try {
        const headers = await getHeaders();
        const url = `${baseURL}/cards?userOnly=true`;
        
        const response = await axios.get(url, { headers });
        // Convertir les prix en nombres
        return response.data.map((card: any) => ({
          ...card,
          price: Number(card.price) || 0,
          soldPrice: card.soldPrice ? Number(card.soldPrice) : undefined
        }));
      } catch (error) {
        console.error('Error in getAllCardsForStats:', error);
        return [];
      }
    };

    const getCard = async (id: number): Promise<Card> => {
      const headers = await getHeaders();
      const response = await axios.get(`${baseURL}/cards/${id}`, { headers });
      // Convertir les prix en nombres
      return {
        ...response.data,
        price: Number(response.data.price) || 0,
        soldPrice: response.data.soldPrice ? Number(response.data.soldPrice) : undefined
      };
    };

    const createCard = async (card: Omit<Card, 'id' | 'userId' | 'createdAt'>): Promise<Card> => {
      const headers = await getHeaders();
      const response = await axios.post(`${baseURL}/cards`, card, { headers });
      return response.data;
    };

    const updateCard = async (id: number, card: Partial<Card>): Promise<Card> => {
      const headers = await getHeaders();
      const response = await axios.put(`${baseURL}/cards/${id}`, card, { headers });
      return response.data;
    };

    const deleteCard = async (id: number): Promise<void> => {
      const headers = await getHeaders();
      await axios.delete(`${baseURL}/cards/${id}`, { headers });
    };

    const getStatistics = async (timeframe?: 'week' | 'month' | 'year'): Promise<CardStats> => {
      const headers = await getHeaders();
      const url = timeframe 
        ? `${baseURL}/statistics?timeframe=${timeframe}`
        : `${baseURL}/statistics`;
      const response = await axios.get(url, { headers });
      return response.data;
    };

    const getCardStats = async (): Promise<CardStats> => {
      try {
        // Utiliser getAllCardsForStats pour récupérer toutes les cartes
        const cards = await getAllCardsForStats();
        
        // Calculer les statistiques à partir de toutes les cartes
        const boughtCards = cards.filter(card => card.status === 'bought');
        const soldCards = cards.filter(card => card.status === 'sold');
        
        const totalInvestment = cards.reduce((sum, card) => sum + card.price, 0);
        const boughtInvestment = boughtCards.reduce((sum, card) => sum + card.price, 0);
        const soldInvestment = soldCards.reduce((sum, card) => sum + card.price, 0);
        
        const totalSold = soldCards.reduce((sum, card) => {
          return sum + (card.soldPrice || 0);
        }, 0);
        
        const profit = totalSold - soldInvestment;
        
        return {
          totalInvestment,
          boughtInvestment,
          soldInvestment,
          totalSold,
          cardsBought: boughtCards.length,
          cardsSold: soldCards.length,
          profit
        };
      } catch (error) {
        console.error('Error calculating card stats:', error);
        // Return default stats on error
        return {
          totalInvestment: 0,
          boughtInvestment: 0,
          soldInvestment: 0,
          totalSold: 0,
          cardsBought: 0,
          cardsSold: 0,
          profit: 0
        };
      }
    };

    return {
      getUserId,
      getAllCards,
      getAllCardsForStats,
      getCard,
      createCard,
      updateCard,
      deleteCard,
      getStatistics,
      getCardStats,
    };
  }, [user?.sub]); // Only recreate the service when the user ID changes
};

export default useCardsService; 