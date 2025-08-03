import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Card } from '../types';
import { useQuery } from '@tanstack/react-query';

interface ExcelImportProps {
  show: boolean;
  onHide: () => void;
  onImportSuccess: (cards: Card[]) => void;
  collectionId?: number;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ 
  show, 
  onHide, 
  onImportSuccess,
  collectionId 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { getAccessTokenSilently, user } = useAuth0();

  // Vérifier la souscription de l'utilisateur
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await axios.get('http://localhost:3001/api/subscriptions/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': user?.sub || 'anonymous-user'
        }
      });
      return response.data;
    },
    enabled: !!user
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    // Vérifier si l'utilisateur a une souscription premium
    if (subscriptionData?.subscription?.name !== 'Premium') {
      setError('Import Excel disponible uniquement pour les utilisateurs Premium');
      return;
    }

    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
      setError('Please select a valid Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = await getAccessTokenSilently();
      const formData = new FormData();
      formData.append('file', file);
      
      if (collectionId) {
        formData.append('collectionId', collectionId.toString());
      }

      const response = await axios.post(
        'http://localhost:3001/api/cards/import',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
            'x-user-id': user?.sub || 'anonymous-user'
          }
        }
      );

      setSuccess(response.data.message);
      onImportSuccess(response.data.cards);
      
      // Reset file input
      setFile(null);
      
      // Close modal after a delay
      setTimeout(() => {
        onHide();
        setSuccess(null);
      }, 2000);
      
    } catch (err: any) {
      console.error('Error importing cards:', err);
      setError(err.response?.data?.error || 'Failed to import cards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Vérifier si l'utilisateur a une souscription premium
    if (subscriptionData?.subscription?.name !== 'Premium') {
      setError('Téléchargement du template disponible uniquement pour les utilisateurs Premium');
      return;
    }

    // Create a simplified template with only the required headers
    const headers = ['name', 'price', 'soldPrice'];
    
    // Create CSV content
    const csvContent = headers.join(',') + '\n';
    
    // Add an example row for clarity
    const exampleRow = ['Connor McDavid Rookie Card', '150.00', ''].join(',') + '\n';
    const exampleRow2 = ['Patrick Mahomes Autograph', '200.00', '350.00'].join(',');
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent + exampleRow + exampleRow2], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'cards_import_template.csv');
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isPremium = subscriptionData?.subscription?.name === 'Premium';

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Import Cards from Excel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        {!isPremium && (
          <Alert variant="warning">
            L'import Excel est une fonctionnalité Premium. Passez à Premium pour importer vos cartes en masse !
          </Alert>
        )}
        
        <p>
          Upload an Excel (.xlsx, .xls) or CSV file with your card data.
          Our simplified import only requires these columns:
        </p>
        
        <ul className="small">
          <li><strong>name</strong> (required): The name of the card</li>
          <li><strong>price</strong>: The purchase price</li>
          <li><strong>soldPrice</strong>: The selling price (if sold - leave empty if not sold)</li>
        </ul>
        
        <Alert variant="info" className="small">
          <strong>Note:</strong> Dates will be automatically generated. For each card, purchase date will be calculated 
          starting from today and going back in time (one day per card). If a card is sold (has a soldPrice), 
          the sell date will be set to the day after purchase.
        </Alert>
        
        <Button 
          variant="outline-secondary" 
          size="sm" 
          className="mb-3"
          onClick={handleDownloadTemplate}
          disabled={!isPremium}
        >
          Download Template
        </Button>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>Select Excel File</Form.Label>
            <Form.Control 
              type="file" 
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              disabled={loading || !isPremium}
            />
          </Form.Group>
          
          <div className="d-flex justify-content-end">
            <Button variant="secondary" onClick={onHide} className="me-2" disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!file || loading || !isPremium}>
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Importing...
                </>
              ) : (
                'Import Cards'
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ExcelImport; 