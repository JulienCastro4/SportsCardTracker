import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useMemo } from 'react';

export interface Collection {
  id: number;
  name: string;
  description: string;
  userId: string;
  createdAt: string;
}

export const useCollectionsService = () => {
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
    const getAllCollections = async (): Promise<Collection[]> => {
      try {
        const headers = await getHeaders();
        console.log('Headers for collections request:', headers);
        console.log('User state:', { userId: user?.sub, isAuthenticated: !!user });
        
        const response = await axios.get(`${baseURL}/collections`, { headers });
        console.log('Collections response:', response.data);
        
        // Si l'utilisateur n'a aucune collection, on ne crée pas de Main Collection
        // car elle devrait être créée au niveau de la base de données
        return response.data;
      } catch (error) {
        console.error('Error in getAllCollections:', error);
        if (axios.isAxiosError(error)) {
          console.error('Axios error details:', {
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              headers: error.config?.headers
            }
          });
        }
        // En cas d'erreur, retourner un tableau vide
        return [];
      }
    };

    const createCollection = async (name: string, description?: string): Promise<Collection> => {
      try {
        const headers = await getHeaders();
        console.log('Creating collection with headers:', headers);
        const response = await axios.post(
          `${baseURL}/collections`,
          { 
            name, 
            description,
            userId: user?.sub || 'anonymous-user'
          },
          { headers }
        );
        console.log('Collection created:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error creating collection:', error);
        if (axios.isAxiosError(error)) {
          console.error('Axios error details for create:', {
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers
          });
        }
        throw error;
      }
    };

    const deleteCollection = async (id: number): Promise<void> => {
      const headers = await getHeaders();
      await axios.delete(`${baseURL}/collections/${id}`, { headers });
    };

    return {
      getAllCollections,
      createCollection,
      deleteCollection,
    };
  }, [user?.sub]); // Only recreate the service when the user ID changes
};

export default useCollectionsService; 