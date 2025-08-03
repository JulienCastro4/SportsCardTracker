import { useContext, createContext } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Créer un contexte par défaut
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: false
});

/**
 * Hook personnalisé pour accéder au contexte d'authentification
 * @returns Le contexte d'authentification
 */
const useAuthContext = () => {
  return useContext(AuthContext);
};

export default useAuthContext; 