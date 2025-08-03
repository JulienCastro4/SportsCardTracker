import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import useAuthService from '../services/auth';

const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuthService();
  const location = useLocation();

  // Check if the current path is for viewing a card detail
  const isCardDetailPage = location.pathname.startsWith('/card/');

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  // Allow access to card detail pages for anonymous users
  if (isCardDetailPage) {
    return <Outlet />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

export default PrivateRoute; 