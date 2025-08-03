import { useState } from 'react';
import { Card as BootstrapCard, Badge, Button, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Card } from '../types';

const DEFAULT_IMAGE_URL = '/default-card.jpg';

interface CardItemProps {
  card: Card;
  onDelete?: (id: number) => void;
  isSelected?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
}

const CardItem = ({ card, onDelete, isSelected = false, selectable = false, onSelect }: CardItemProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageUrl, setImageUrl] = useState(card.imageUrl || DEFAULT_IMAGE_URL);

  const handleImageError = () => {
    setImageUrl(DEFAULT_IMAGE_URL);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bought':
        return <Badge bg="success">Bought</Badge>;
      case 'sold':
        return <Badge bg="danger">Sold</Badge>;
      case 'available':
        return <Badge bg="primary">Available</Badge>;
      default:
        return null;
    }
  };

  const calculateROI = () => {
    if (card.status === 'sold' && card.soldPrice && card.price) {
      const roi = ((Number(card.soldPrice) - Number(card.price)) / Number(card.price)) * 100;
      return (
        <span className={`fw-bold ${roi > 0 ? 'text-success' : (roi < 0 ? 'text-danger' : 'text-secondary')}`}>
          {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
        </span>
      );
    }
    return <span className="fw-bold text-primary">${Number(card.price).toFixed(2)}</span>;
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(card.id);
    }
    setShowDeleteModal(false);
  };

  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect();
    }
  };

  const handleSelectButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectable && onSelect) {
      onSelect();
    }
  };

  const cardStyle = {
    cursor: selectable ? 'pointer' : 'default',
    border: isSelected ? '2px solid #007bff' : '1px solid rgba(0,0,0,.125)',
    boxShadow: isSelected ? '0 0 10px rgba(0, 123, 255, 0.5)' : '0 .125rem .25rem rgba(0,0,0,.075)'
  };

  return (
    <>
      <BootstrapCard 
        className="sports-card-item h-100" 
        style={cardStyle} 
        onClick={handleCardClick}
      >
        {isSelected && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '10px', 
              right: '10px', 
              backgroundColor: '#007bff', 
              borderRadius: '50%', 
              width: '25px', 
              height: '25px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <i className="fas fa-check"></i>
          </div>
        )}
        <BootstrapCard.Img 
          variant="top" 
          src={imageUrl} 
          alt={card.name}
          style={{ height: '250px', objectFit: 'contain', padding: '10px' }}
          onError={handleImageError}
        />
        <BootstrapCard.Body className="d-flex flex-column">
          <BootstrapCard.Title className="text-truncate" title={card.name}>{card.name}</BootstrapCard.Title>
          <div className="d-flex justify-content-between align-items-center mb-2">
            {card.status === 'sold' ? (
              <div>
                <div className="text-success">
                  <span className="fw-bold">${Number(card.price).toFixed(2)} → ${Number(card.soldPrice || 0).toFixed(2)}</span>
                </div>
                <div className={`small ${(Number(card.soldPrice || 0) - Number(card.price)) > 0 ? 'text-success' : 'text-danger'}`}>
                  {calculateROI()}
                </div>
              </div>
            ) : (
              <span className="fw-bold text-primary">${Number(card.price).toFixed(2)}</span>
            )}
            {getStatusBadge(card.status)}
          </div>
          {card.category && (
            <BootstrapCard.Text className="text-muted small mb-3">
              Category: {card.category}
            </BootstrapCard.Text>
          )}
          
          <BootstrapCard.Text className="small mb-2">
            {Boolean(card.graded) ? (
              <>
                <span className="badge bg-warning me-1">Graded</span>
                {card.gradingCompany && card.gradingValue && (
                  <span className="fw-bold">
                    {card.gradingCompany} {Number(card.gradingValue).toFixed(1)}
                  </span>
                )}
              </>
            ) : (
              <span className="badge bg-secondary me-1">Raw Card</span>
            )}
          </BootstrapCard.Text>
          
          <div className="mt-auto pt-2">
            <div className="d-flex gap-2">
              {!selectable && (
                <Link to={`/card/${card.id}`} className="text-decoration-none w-100">
                  <Button variant="primary" className="w-100">
                    View Details
                  </Button>
                </Link>
              )}
              {selectable && (
                <Button 
                  variant={isSelected ? "success" : "outline-primary"} 
                  className="w-100"
                  onClick={handleSelectButtonClick}
                >
                  {isSelected ? "Selected" : "Select"}
                </Button>
              )}
            </div>
          </div>
        </BootstrapCard.Body>
      </BootstrapCard>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete "{card.name}"? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CardItem; 