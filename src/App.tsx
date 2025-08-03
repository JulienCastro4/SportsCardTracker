import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Container, Spinner } from 'react-bootstrap';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MyCollectionPage from './pages/MyCollectionPage';
import AddCardPage from './pages/AddCardPage';
import CardDetailPage from './pages/CardDetailPage';
import StatisticsPage from './pages/StatisticsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import { useAuth0 } from '@auth0/auth0-react';

function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth0();
  const location = useLocation();

  if (isLoading && location.pathname === '/') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <Container>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          {isAuthenticated ? (
            <>
              <Route path="/my-collection" element={<MyCollectionPage />} />
              <Route path="/add-card" element={<AddCardPage />} />
              <Route path="/card/:id" element={<CardDetailPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
            </>
          ) : (
            <Route path="*" element={<HomePage />} />
          )}
        </Routes>
      </Container>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
