export interface Card {
  id: number;
  name: string;
  price: number;
  soldPrice?: number;
  imageUrl: string;
  status: 'bought' | 'sold';
  boughtDate: string;
  soldDate?: string;
  description?: string;
  category: string;
  collectionId?: number;
  userId: string;
  createdAt: string;
  graded: boolean | number;
  gradingCompany?: 'PSA' | 'BGS';
  gradingValue?: number;
}

export interface Collection {
  id: number;
  name: string;
  description: string;
  userId: string;
  createdAt: string;
}

export interface CardStats {
  totalInvestment: number;
  totalSold: number;
  cardsBought: number;
  cardsSold: number;
  profit: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
} 