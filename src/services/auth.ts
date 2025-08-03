import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';

export const useAuthService = () => {
  const {
    isAuthenticated,
    loginWithRedirect,
    logout,
    user,
    getAccessTokenSilently,
    isLoading,
    error
  } = useAuth0();

  // Stocke les informations utilisateur dans le localStorage lorsqu'elles changent
  useEffect(() => {
    if (user) {
      localStorage.setItem('auth0User', JSON.stringify(user));
    }
  }, [user]);

  const login = () => {
    loginWithRedirect({
      authorizationParams: {
        scope: 'openid profile email'
      }
    });
  };

  const logoutUser = () => {
    // Supprime les informations utilisateur du localStorage
    localStorage.removeItem('auth0User');
    
    logout({ 
      logoutParams: { 
        returnTo: window.location.origin 
      } 
    });
  };

  const getToken = async () => {
    try {
      return await getAccessTokenSilently();
    } catch (err) {
      console.error('Error getting token:', err);
      return null;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    login,
    logout: logoutUser,
    getToken,
  };
};

export default useAuthService; 