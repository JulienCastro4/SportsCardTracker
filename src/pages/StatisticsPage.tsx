import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Statistics from '../components/Statistics';

const StatisticsPage: React.FC = () => {
  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center my-4">
        <h1>Statistics</h1>
        <div>
          <Link to="/my-collection" className="me-2">
            <Button variant="outline-primary">View Collection</Button>
          </Link>
          <Link to="/add-card">
            <Button variant="primary">Add New Card</Button>
          </Link>
        </div>
      </div>

      <p className="lead mb-4">
        Track the performance of your card collection over time. See your investments, sales, and profits.
      </p>

      <Statistics />
    </Container>
  );
};

export default StatisticsPage; 