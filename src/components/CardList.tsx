import React from 'react';
import { Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Card } from '../types';
import useCardsService from '../services/cards';
import CardItem from './CardItem';

interface CardListProps {
  cards: Card[];
  onCardDeleted?: () => void;
  loading?: boolean;
  error?: string | null;
  multiSelectMode?: boolean;
  selectedCards?: number[];
  onCardSelect?: (cardId: number) => void;
}

const CardList: React.FC<CardListProps> = ({ 
  cards, 
  onCardDeleted, 
  loading, 
  error, 
  multiSelectMode = false,
  selectedCards = [],
  onCardSelect
}) => {
  const cardsService = useCardsService();

  const handleDelete = async (cardId: number) => {
    if (!onCardDeleted) return;
    
    try {
      await cardsService.deleteCard(cardId);
      onCardDeleted();
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Failed to delete card. Please try again.');
    }
  };

  const handleCardClick = (cardId: number) => {
    if (multiSelectMode && onCardSelect) {
      onCardSelect(cardId);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center my-5">
        <h3>No cards found</h3>
        <p>Start by adding some cards to your collection!</p>
      </div>
    );
  }

  return (
    <Row className="justify-content-center">
      {cards.map(card => (
        <Col key={card.id} md={4} lg={3} className="mb-4">
          <CardItem 
            card={card} 
            onDelete={onCardDeleted ? handleDelete : undefined} 
            isSelected={multiSelectMode && selectedCards.includes(card.id)}
            selectable={multiSelectMode}
            onSelect={() => handleCardClick(card.id)}
          />
        </Col>
      ))}
    </Row>
  );
};

export default CardList; 