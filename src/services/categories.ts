import axios from 'axios';

export interface Category {
  id: number;
  name: string;
  createdAt: string;
}

const useCategoriesService = () => {
  const baseURL = 'http://localhost:3001/api';

  const getAllCategories = async (): Promise<Category[]> => {
    try {
      const response = await axios.get(`${baseURL}/categories`);
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  };

  return {
    getAllCategories
  };
};

export default useCategoriesService; 