import React from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FaCheck, FaTimes, FaCrown } from 'react-icons/fa';

interface SubscriptionType {
  id: number;
  name: string;
  max_cards: number;
  price: number;
}

interface Subscription {
  id: number;
  subscription_type: SubscriptionType;
  name: string;
  is_free_tier: boolean;
}

interface CardCount {
  count: number;
}

const PriceDisplay = ({ price, period }: { price: string, period: string }) => (
  <div className="pricing mt-3">
    <div className="d-flex align-items-start justify-content-center">
      {price === "0" ? (
        <span className="text-white h2 mb-0">$0</span>
      ) : (
        <>
          <span className="text-white h2 mb-0">$</span>
          <span className="text-white display-4 fw-bold">9</span>
          <span className="text-white h2 mb-0">.99</span>
        </>
      )}
    </div>
    {period !== "free" && <p className="text-white mb-0">{period}</p>}
  </div>
);

const SubscriptionPage: React.FC = () => {
  const { user, getAccessTokenSilently } = useAuth0();

  // Fetch current subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await axios.get<{ subscription: Subscription }>('http://localhost:3001/api/subscriptions/current', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': user?.sub
        }
      });
      return response.data;
    }
  });

  // Fetch current card count
  const { data: cardCount } = useQuery({
    queryKey: ['cardCount'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await axios.get<CardCount>('http://localhost:3001/api/subscriptions/card-count', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': user?.sub
        }
      });
      return response.data.count;
    }
  });

  const handleSubscribe = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post('http://localhost:3001/api/subscriptions/premium', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': user?.sub
        }
      });
      // Refresh the subscription data
      window.location.reload();
    } catch (error) {
      console.error('Error subscribing:', error);
    }
  };

  const handleCancel = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post('http://localhost:3001/api/subscriptions/cancel', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': user?.sub
        }
      });
      // Refresh the subscription data
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling:', error);
    }
  };

  const isPremium = subscriptionData?.subscription?.name === 'Premium';

  return (
    <Container className="py-5">
      <h1 className="text-center mb-4">Subscription Plans</h1>
      
      {/* Current Status */}
      <div className="text-center mb-5">
        <h4 className="mb-3">
          Current Plan: {' '}
          <Badge bg={isPremium ? 'warning' : 'secondary'} className="px-3 py-2">
            {isPremium ? 'Premium' : 'Free'} Plan
          </Badge>
        </h4>
        <p className="text-muted mb-0">
          Cards in collection: <span className="fw-bold">{cardCount ?? 0}</span>
        </p>
      </div>

      <Row className="justify-content-center g-4">
        {/* Free Plan */}
        <Col md={5} lg={4}>
          <Card className={`h-100 shadow-sm ${!isPremium ? 'border-secondary' : ''}`}>
            <Card.Header className="text-center pt-4 pb-3 bg-secondary text-white">
              <h3 className="mb-0">Free Plan</h3>
              <PriceDisplay price="0" period="free" />
            </Card.Header>
            <Card.Body className="px-4 pt-4">
              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Up to 10 cards</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Basic card management</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Card statistics</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Multiple collections</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Card grading tracking</span>
                </li>
                <li className="mb-3 d-flex align-items-center text-muted">
                  <FaTimes className="text-danger me-3" size={20} />
                  <span>Import with Excel</span>
                </li>
                <li className="mb-3 d-flex align-items-center text-muted">
                  <FaTimes className="text-danger me-3" size={20} />
                  <span>Export to PDF</span>
                </li>
              </ul>
            </Card.Body>
            <Card.Footer className="text-center border-0 bg-transparent pb-4">
              {!isPremium && (
                <Button variant="outline-secondary" disabled className="px-4 py-2 w-75">
                  Current Plan
                </Button>
              )}
            </Card.Footer>
          </Card>
        </Col>

        {/* Premium Plan */}
        <Col md={5} lg={4}>
          <Card className={`h-100 shadow ${isPremium ? 'border-warning' : ''}`}>
            <Card.Header className="text-center pt-4 pb-3 bg-warning text-dark">
              <h3 className="mb-0">Premium Plan</h3>
              <PriceDisplay price="9.99" period="per month" />
            </Card.Header>
            <Card.Body className="px-4 pt-4">
              <ul className="list-unstyled">
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Unlimited cards</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Import with Excel</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Export to PDF</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Advanced statistics</span>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <FaCheck className="text-success me-3" size={20} />
                  <span>Priority support</span>
                </li>
              </ul>
            </Card.Body>
            <Card.Footer className="text-center border-0 bg-transparent pb-4">
              {isPremium ? (
                <Button variant="danger" onClick={handleCancel} className="px-4 py-2 w-75">
                  Cancel Subscription
                </Button>
              ) : (
                <Button variant="warning" onClick={handleSubscribe} className="px-4 py-2 w-75 text-dark">
                  Upgrade Now
                </Button>
              )}
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {/* FAQ Section */}
      <section className="mt-5">
        <h3 className="text-center mb-4">Frequently Asked Questions</h3>
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <h5>What happens when I reach the card limit?</h5>
                <p className="mb-0">You'll be redirected to the subscription page to upgrade to Premium or remove some existing cards.</p>
              </Card.Body>
            </Card>
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <h5>Can I cancel my Premium subscription?</h5>
                <p className="mb-0">Yes, you can cancel anytime. Your Premium features will remain active until the end of your billing period.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Debug Section */}
      <section className="mt-5">
        <h3 className="text-center mb-4">Debug Information</h3>
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="mb-3 shadow-sm bg-light">
              <Card.Body>
                <h5>Subscription Details</h5>
                <pre className="mb-0">
                  {JSON.stringify({
                    currentPlan: subscriptionData?.subscription?.name || 'Loading...',
                    isPremium: isPremium,
                    cardCount: cardCount,
                    maxCards: subscriptionData?.subscription?.subscription_type?.max_cards || 'Loading...',
                    subscriptionDetails: subscriptionData?.subscription || 'Loading...'
                  }, null, 2)}
                </pre>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </section>
    </Container>
  );
};

export default SubscriptionPage; 