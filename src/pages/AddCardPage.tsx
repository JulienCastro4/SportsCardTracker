import React, { useState } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import useCardsService from '../services/cards';
import CardForm from '../components/CardForm';
import { Card } from '../types';

const AddCardPage: React.FC = () => {
  const navigate = useNavigate();
  const cardsService = useCardsService();
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (cardData: Omit<Card, 'id'>) => {
    setError('');
    setIsSubmitting(true);

    try {
      // Create the card
      await cardsService.createCard(cardData);
      navigate('/my-collection');
    } catch (error) {
      console.error('Error creating card:', error);
      setError(error instanceof Error ? error.message : 'Failed to create card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Add New Card</h1>

      {error && <Alert variant="danger">{error}</Alert>}

      <CardForm 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting}
      />
    </Container>
  );
};

export default AddCardPage; 