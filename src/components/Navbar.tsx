import React from "react";
import {
  Container,
  Nav,
  Navbar as BootstrapNavbar,
  Button,
  Spinner,
} from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import useAuthService from "../services/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faLayerGroup,
  faChartLine,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import "../styles/Navbar.css";
import { useAuth0 } from '@auth0/auth0-react';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, login, logout, isLoading } = useAuthService();
  const location = useLocation();
  const { loginWithRedirect } = useAuth0();

  return (
    <BootstrapNavbar
      bg="dark"
      variant="dark"
      expand="lg"
      fixed="top"
      className="main-navbar"
    >
      <Container fluid>
        <BootstrapNavbar.Brand as={Link} to="/" className="brand-logo">
          MyCardCollection
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="responsive-navbar-nav" />

        <BootstrapNavbar.Collapse id="responsive-navbar-nav">
          {isAuthenticated && (
            <Nav className="mx-auto">
              <Nav.Link
                as={Link}
                to="/"
                className={location.pathname === "/" ? "active" : ""}
              >
                <FontAwesomeIcon icon={faHome} className="me-1" /> Home
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/my-collection"
                className={
                  location.pathname === "/my-collection" ? "active" : ""
                }
              >
                <FontAwesomeIcon icon={faLayerGroup} className="me-1" /> My
                Collection
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/add-card"
                className={location.pathname === "/add-card" ? "active" : ""}
              >
                <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Card
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/statistics"
                className={location.pathname === "/statistics" ? "active" : ""}
              >
                <FontAwesomeIcon icon={faChartLine} className="me-1" />{" "}
                Statistics
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/subscription"
                className={location.pathname === "/subscription" ? "active" : ""}
              >
                Subscription
              </Nav.Link>
            </Nav>
          )}

          <div className="user-auth-section">
            {isAuthenticated ? (
              <div className="user-profile d-flex align-items-center">
                <span className="user-greeting">
                  Hello, {user?.name || "User"}
                </span>
                <Button
                  variant="outline-warning"
                  onClick={logout}
                  className="sign-out-btn"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="warning"
                onClick={() => loginWithRedirect()}
                disabled={isLoading}
                className="sign-in-btn"
              >
                {isLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-1"
                    />
                    Loading...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            )}
          </div>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
