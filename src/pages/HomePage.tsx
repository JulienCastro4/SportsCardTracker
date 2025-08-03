import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faPlus, faDollarSign, faLayerGroup, faTrophy, faUser, faSignInAlt, faCaretRight } from '@fortawesome/free-solid-svg-icons';
import CardList from '../components/CardList';
import useCardsService from '../services/cards';
import useAuthService from '../services/auth';

const HomePage: React.FC = () => {
  const [topCards, setTopCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, bought: 0, sold: 0 });
  const cardsService = useCardsService();
  const { isAuthenticated, login } = useAuthService();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTopPerformingCards();
      fetchCardStats();
    }
  }, [isAuthenticated]);

  const fetchCardStats = async () => {
    try {
      const allCards = await cardsService.getAllCards();
      const boughtCards = allCards.filter(card => card.status === 'bought');
      const soldCards = allCards.filter(card => card.status === 'sold');
      
      setStats({
        total: allCards.length,
        bought: boughtCards.length,
        sold: soldCards.length
      });
    } catch (err) {
      console.error('Error fetching card stats:', err);
    }
  };

  const fetchTopPerformingCards = async () => {
    try {
      setLoading(true);
      const allCards = await cardsService.getAllCards();
      
      // Calculer le ROI pour chaque carte vendue
      const soldCards = allCards.filter(card => 
        card.status === 'sold' && 
        card.soldPrice !== undefined && 
        card.price
      );
      
      const cardsWithRoi = soldCards.map(card => ({
        ...card,
        roi: ((card.soldPrice as number) - card.price) / card.price * 100
      }));
      
      // Trier par ROI et prendre les 3 meilleures
      const bestPerforming = cardsWithRoi
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 3);
      
      setTopCards(bestPerforming);
      setError(null);
    } catch (err) {
      console.error('Error fetching top cards:', err);
      setError('Failed to load top performing cards.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row className="mb-5 justify-content-center">
        <Col md={10} lg={8} className="text-center">
          <h1 className="display-4 fw-bold mb-4 text-dark">Manage Your Card Collection</h1>
          <p className="lead mb-4 text-secondary">
            Track purchases, sales, and investment performance of your card collection
            with our easy-to-use platform.
          </p>
          <div className="d-flex justify-content-center">
            {isAuthenticated ? (
              <>
                <Link to="/add-card" className="me-3">
                  <Button variant="warning" size="lg" className="fw-bold">
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Add New Card
                  </Button>
                </Link>
                <Link to="/statistics">
                  <Button variant="outline-secondary" size="lg" className="fw-bold">
                    <FontAwesomeIcon icon={faChartLine} className="me-2" />
                    View Stats
                  </Button>
                </Link>
              </>
            ) : (
              <Button variant="warning" size="lg" className="fw-bold" onClick={login}>
                <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                Sign In to Get Started
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {isAuthenticated && stats.total > 0 && (
        <Row className="mb-5 justify-content-center">
          <Col md={10} className="text-center">
            <Card className="bg-light shadow-sm border-0">
              <Card.Body>
                <Row>
                  <Col md={4}>
                    <h3 className="text-dark">{stats.total}</h3>
                    <p className="text-secondary mb-0">Total Cards</p>
                  </Col>
                  <Col md={4}>
                    <h3 className="text-dark">{stats.bought}</h3>
                    <p className="text-secondary mb-0">In Collection</p>
                  </Col>
                  <Col md={4}>
                    <h3 className="text-dark">{stats.sold}</h3>
                    <p className="text-secondary mb-0">Cards Sold</p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="mb-5">
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm border-0">
            <Card.Header className="bg-dark text-white">
              <h4 className="mb-0">
                <FontAwesomeIcon icon={faDollarSign} className="me-2" />
                Track Investments
              </h4>
            </Card.Header>
            <Card.Body>
              <p>Record purchase prices, dates, and details for every card in your collection. Keep track of your investment over time.</p>
              {isAuthenticated ? (
                <Link to="/my-collection">
                  <Button variant="outline-warning" className="w-100">
                    View Your Collection
                  </Button>
                </Link>
              ) : (
                <Button variant="outline-secondary" className="w-100" onClick={login}>
                  <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                  Sign In to View
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm border-0">
            <Card.Header className="bg-warning text-dark">
              <h4 className="mb-0">
                <FontAwesomeIcon icon={faChartLine} className="me-2" />
                Monitor Performance
              </h4>
            </Card.Header>
            <Card.Body>
              <p>Track sales and see your profits with detailed statistics. Analyze your collection's performance over time.</p>
              {isAuthenticated ? (
                <Link to="/statistics">
                  <Button variant="outline-secondary" className="w-100">
                    View Statistics
                  </Button>
                </Link>
              ) : (
                <Button variant="outline-secondary" className="w-100" onClick={login}>
                  <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                  Sign In to View
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm border-0">
            <Card.Header className="bg-dark text-white">
              <h4 className="mb-0">
                <FontAwesomeIcon icon={faLayerGroup} className="me-2" />
                Organize Cards
              </h4>
            </Card.Header>
            <Card.Body>
              <p>Group your cards by sport, player, team, or create custom collections to keep everything organized.</p>
              {isAuthenticated ? (
                <Link to="/add-card">
                  <Button variant="outline-warning" className="w-100">
                    Add New Card
                  </Button>
                </Link>
              ) : (
                <Button variant="outline-secondary" className="w-100" onClick={login}>
                  <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                  Sign In to Add Cards
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {isAuthenticated ? (
        <div className="mb-5">
          <div className="d-flex justify-content-center align-items-center mb-4">
            <h2 className="me-3">
              <FontAwesomeIcon icon={faTrophy} className="me-2 text-warning" />
              Top Performing Cards
            </h2>
            <Badge bg="warning" text="dark" className="p-2">Best ROI</Badge>
          </div>
          
          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" variant="warning" />
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : topCards.length > 0 ? (
            <>
              <CardList cards={topCards} />
              <div className="text-center mt-3">
                <Link to="/my-collection">
                  <Button variant="outline-secondary">
                    View Full Collection
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <Alert variant="info" className="text-center">
              <h4>No sold cards yet</h4>
              <p>Once you sell some cards, your best performing cards will appear here.</p>
              <Link to="/add-card">
                <Button variant="warning" className="mt-2">
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  Add New Card
                </Button>
              </Link>
            </Alert>
          )}
        </div>
      ) : (
        <div className="mb-5">
          <Card className="bg-light shadow-sm border-0">
            <Card.Body className="text-center py-5">
              <h2>
                <FontAwesomeIcon icon={faTrophy} className="me-2 text-warning" />
                See Your Top Performing Cards
              </h2>
              <p className="lead mt-3 mb-4">
                Track which cards in your collection have the best return on investment.
              </p>
              <Button variant="warning" size="lg" onClick={login}>
                <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                Sign In to View Your Cards Performance
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}
    </Container>
  );
};

export default HomePage; 