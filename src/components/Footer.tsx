import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-light py-4">
      <Container>
        <Row className="mb-4">
          <Col md={4} className="mb-3 mb-md-0">
            <h5 className="mb-3 footer-title">MyCardCollection</h5>
            <p className="mb-0 footer-text">
              Track your card collection, monitor market values, and analyze your investments.
            </p>
          </Col>
          <Col md={3} className="mb-3 mb-md-0">
            <h5 className="mb-3 footer-title">Quick Links</h5>
            <ul className="list-unstyled footer-links">
              <li><Link to="/" className="text-light text-decoration-none">Home</Link></li>
              <li><Link to="/my-collection" className="text-light text-decoration-none">My Collection</Link></li>
              <li><Link to="/statistics" className="text-light text-decoration-none">Statistics</Link></li>
              <li><Link to="/add-card" className="text-light text-decoration-none">Add Card</Link></li>
            </ul>
          </Col>
          <Col md={3} className="mb-3 mb-md-0">
            <h5 className="mb-3 footer-title">Resources</h5>
            <ul className="list-unstyled footer-links">
              <li><a href="#" className="text-light text-decoration-none">Help Center</a></li>
              <li><a href="#" className="text-light text-decoration-none">Market Trends</a></li>
              <li><a href="#" className="text-light text-decoration-none">Blog</a></li>
              <li><a href="#" className="text-light text-decoration-none">API</a></li>
            </ul>
          </Col>
          <Col md={2}>
            <h5 className="mb-3 footer-title">Connect</h5>
            <div className="d-flex footer-social">
              <a href="#" className="text-light me-3 fs-5"><i className="bi bi-twitter-x"></i></a>
              <a href="#" className="text-light me-3 fs-5"><i className="bi bi-facebook"></i></a>
              <a href="#" className="text-light me-3 fs-5"><i className="bi bi-instagram"></i></a>
              <a href="#" className="text-light fs-5"><i className="bi bi-github"></i></a>
            </div>
          </Col>
        </Row>
        <Row className="border-top pt-3">
          <Col className="text-center">
            <p className="mb-0 small">© {currentYear} MyCardCollection. All rights reserved.</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer; 