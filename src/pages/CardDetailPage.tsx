import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card as BootstrapCard, Badge, Button, Alert, Modal, Form, Image, Spinner } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useCardsService from '../services/cards';
import { Card } from '../types';
import CardForm from '../components/CardForm';
import useCollectionsService, { Collection } from '../services/collections';
import useAuthContext from '../hooks/useAuthContext';
import formatDateWithTimezone from '../utils/formatDate';
import { API_BASE_URL, DEFAULT_IMAGE_URL } from '../config';

// Helper pour convertir les valeurs booléennes (pour gérer aussi les valeurs numériques)
const isTruthy = (val: boolean | number | undefined): boolean => {
  return val === true || val === 1;
};

// Fonction pour obtenir la date d'aujourd'hui au format ISO
function getTodayISODate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

const CardDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const cardsService = useCardsService();
  const collectionsService = useCollectionsService();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soldPrice, setSoldPrice] = useState<number>(0);
  const [soldDate, setSoldDate] = useState<string>(getTodayISODate());
  const [sellErrorMessage, setSellErrorMessage] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // États pour le formulaire d'édition complet
  const [editFormData, setEditFormData] = useState<Partial<Card>>({});
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(DEFAULT_IMAGE_URL);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // État pour les collections disponibles
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);

  // État pour suivre les champs invalides
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});

  // Charger les collections au chargement du composant
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoadingCollections(true);
        const data = await collectionsService.getAllCollections();
        setCollections(data);
      } catch (error) {
        console.error('Error loading collections:', error);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchCollections();
  }, []);

  // Fetch card only once when component mounts or id changes
  useEffect(() => {
    let isMounted = true;

    const fetchCard = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await cardsService.getCard(parseInt(id));
        if (isMounted) {
          // Assurer que les propriétés obligatoires sont présentes
          const safeCard = {
            ...data,
            boughtDate: data.boughtDate || getTodayISODate(),
            category: data.category || 'Other',
            graded: Boolean(data.graded),
            gradingCompany: data.graded ? data.gradingCompany : undefined,
            gradingValue: data.graded ? Number(data.gradingValue) : undefined,
            price: Number(data.price) || 0,
            soldPrice: data.soldPrice ? Number(data.soldPrice) : undefined,
            imageUrl: data.imageUrl || DEFAULT_IMAGE_URL
          };
          setCard(safeCard);
          setSoldPrice(safeCard.price); // Initialize sold price with purchase price
          
          // Initialiser les données du formulaire d'édition
          setEditFormData({
            ...safeCard,
            boughtDate: safeCard.boughtDate,
            soldDate: safeCard.soldDate,
            graded: Boolean(safeCard.graded),
            gradingCompany: safeCard.graded ? safeCard.gradingCompany : undefined,
            gradingValue: safeCard.graded ? Number(safeCard.gradingValue) : undefined
          });
          setPreviewUrl(safeCard.imageUrl || DEFAULT_IMAGE_URL);
          
          setError(null);
          fetchedRef.current = true;
        }
      } catch (err) {
        console.error('Error fetching card:', err);
        if (isMounted) {
          setError('Failed to load card details. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCard();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await cardsService.deleteCard(parseInt(id));
      navigate('/my-collection');
    } catch (err) {
      console.error('Error deleting card:', err);
      setError('Failed to delete card. Please try again.');
      setShowDeleteModal(false);
    }
  };

  const handleUpdate = async () => {
    if (!id || !card || !editFormData) return;
    
    // Validation
    setEditValidationError(null);
    
    // Réinitialiser les champs invalides
    const newInvalidFields: Record<string, boolean> = {};
    let hasError = false;
    
    // Vérifier que le nom est saisi
    if (!editFormData.name) {
      newInvalidFields.name = true;
      setEditValidationError("Card name is required");
      hasError = true;
    }
    
    // Vérifier que la date d'achat est saisie
    if (!editFormData.boughtDate) {
      newInvalidFields.boughtDate = true;
      setEditValidationError("Purchase date is required");
      hasError = true;
    }
    
    // Vérifier que le prix d'achat est valide
    if (!editFormData.price || editFormData.price <= 0) {
      newInvalidFields.price = true;
      setEditValidationError("Purchase price must be greater than 0");
      hasError = true;
    }
    
    // Vérifier les champs de gradation si la carte est gradée
    const isGraded = Boolean(editFormData.graded);
    if (isGraded) {
      if (!editFormData.gradingCompany) {
        newInvalidFields.gradingCompany = true;
        setEditValidationError("Grading company is required for graded cards");
        hasError = true;
      }
      if (!editFormData.gradingValue) {
        newInvalidFields.gradingValue = true;
        setEditValidationError("Grade value is required for graded cards");
        hasError = true;
      }
    }
    
    // Si le statut est 'sold', vérifier les données de vente
    if (editFormData.status === 'sold') {
      // Vérifier que le prix de vente est valide
      if (!editFormData.soldPrice || editFormData.soldPrice <= 0) {
        newInvalidFields.soldPrice = true;
        setEditValidationError("Sold price must be greater than 0");
        hasError = true;
      }
      
      // Vérifier que la date de vente est saisie
      if (!editFormData.soldDate) {
        newInvalidFields.soldDate = true;
        setEditValidationError("Sold date is required");
        hasError = true;
      }
      
      // Vérifier que la date de vente n'est pas antérieure à la date d'achat
      if (editFormData.soldDate && editFormData.boughtDate) {
        const boughtDate = new Date(editFormData.boughtDate);
        const soldDate = new Date(editFormData.soldDate);
        
        boughtDate.setHours(0, 0, 0, 0);
        soldDate.setHours(0, 0, 0, 0);
        
        if (soldDate < boughtDate) {
          newInvalidFields.soldDate = true;
          setEditValidationError("Sold date cannot be earlier than bought date");
          hasError = true;
          return;
        }
      }
    }
    
    // Mettre à jour les champs invalides
    setInvalidFields(newInvalidFields);
    
    // Arrêter si des erreurs sont présentes
    if (hasError) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Préparer les données de mise à jour
      const updateData: Partial<Card> = {
        ...editFormData,
        graded: isGraded,
        gradingCompany: isGraded ? editFormData.gradingCompany : undefined,
        gradingValue: isGraded && editFormData.gradingValue ? Number(editFormData.gradingValue) : undefined,
        price: Number(editFormData.price),
        // Si le statut change de 'sold' à 'bought', réinitialiser les données de vente
        soldPrice: editFormData.status === 'bought' ? undefined : (editFormData.soldPrice ? Number(editFormData.soldPrice) : undefined),
        soldDate: editFormData.status === 'bought' ? undefined : editFormData.soldDate,
        status: editFormData.status || 'bought',
        boughtDate: editFormData.boughtDate || getTodayISODate(),
        // S'assurer que l'URL de l'image est incluse
        imageUrl: editFormData.imageUrl || DEFAULT_IMAGE_URL
      };
      
      console.log('Updating card with data:', updateData);
      const updatedCard = await cardsService.updateCard(parseInt(id), updateData);
      setShowEditModal(false);
      
      if (updatedCard) {
        const safeCard: Card = {
          ...updatedCard,
          id: updatedCard.id,
          name: updatedCard.name,
          boughtDate: updatedCard.boughtDate || getTodayISODate(),
          category: updatedCard.category || 'Other',
          userId: updatedCard.userId,
          createdAt: updatedCard.createdAt,
          status: updatedCard.status || 'bought',
          price: Number(updatedCard.price),
          soldPrice: updatedCard.soldPrice ? Number(updatedCard.soldPrice) : undefined,
          soldDate: updatedCard.soldDate || undefined,
          graded: Boolean(updatedCard.graded),
          gradingCompany: updatedCard.graded ? updatedCard.gradingCompany : undefined,
          gradingValue: updatedCard.graded ? Number(updatedCard.gradingValue) : undefined,
          imageUrl: updatedCard.imageUrl || DEFAULT_IMAGE_URL,
          description: updatedCard.description || '',
          collectionId: updatedCard.collectionId || 1
        };
        setCard(safeCard);
        console.log('Card updated successfully:', safeCard);
      }
      setError(null);
      
      // Forcer un rechargement de la page
      window.location.reload();
    } catch (err) {
      console.error('Error updating card:', err);
      setError('Failed to update card. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSellCard = async () => {
    if (!id || !card) return;
    
    // Réinitialiser le message d'erreur
    setSellErrorMessage(null);
    
    // Vérifier que la carte a une date d'achat
    if (!card.boughtDate) {
      setSellErrorMessage('Purchase date is required before selling a card');
      return;
    }
    
    // Vérifier que la date de vente n'est pas antérieure à la date d'achat
    if (soldDate < card.boughtDate) {
      setSellErrorMessage('Sold date cannot be earlier than bought date');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Préparer les données pour la vente
      const saleData = {
        status: 'sold' as const,
        soldPrice,
        soldDate,
        // Conserver toutes les propriétés originales importantes
        name: card.name,
        price: card.price,
        imageUrl: card.imageUrl,
        boughtDate: card.boughtDate,
        category: card.category,
        description: card.description,
        collectionId: card.collectionId,
        graded: card.graded,
        gradingCompany: card.gradingCompany,
        gradingValue: card.gradingValue
      };
      
      await cardsService.updateCard(parseInt(id), saleData);
      setShowSellModal(false);
      
      // Forcer un rechargement de la page
      window.location.reload();
    } catch (err) {
      console.error('Error selling card:', err);
      setError('Failed to sell card. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bought':
        return <Badge bg="success">Bought</Badge>;
      case 'sold':
        return <Badge bg="danger">Sold</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    // Format YYYY-MM-DD nécessaire pour les inputs HTML type="date"
    return dateString.split('T')[0];
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
    
    // Réinitialiser l'erreur de validation et marquer le champ comme valide
    setEditValidationError(null);
    setInvalidFields(prev => ({
      ...prev,
      [name]: false
    }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview immediately
      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(localPreviewUrl);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', file);

      try {
        console.log('Uploading image...');
        console.log('User ID:', user?.id);
        
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'x-user-id': user?.id || ''
          },
          body: formData
        });

        console.log('Upload response status:', response.status);
        const responseData = await response.json();
        console.log('Upload response:', responseData);

        if (!response.ok) {
          throw new Error(responseData.error || 'Failed to upload image');
        }

        const imageUrl = responseData.imageUrl;
        console.log('Image URL:', imageUrl);
        
        // Update form data with the server URL
        setEditFormData(prev => ({
          ...prev,
          imageUrl: imageUrl
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        // En cas d'erreur, garder l'image par défaut
        setEditFormData(prev => ({
          ...prev,
          imageUrl: DEFAULT_IMAGE_URL
        }));
      }
    }
  };

  const handleImageError = () => {
    setPreviewUrl(DEFAULT_IMAGE_URL);
    if (editFormData) {
      setEditFormData(prev => ({
        ...prev,
        imageUrl: DEFAULT_IMAGE_URL
      }));
    }
  };

  const renderGradingInfo = () => {
    if (!card) return null;
    
    const isGraded = Boolean(card.graded);
    if (!isGraded) {
      return (
        <Badge bg="secondary">Raw Card</Badge>
      );
    }

    return (
      <div className="d-flex align-items-center">
        <Badge bg="warning" className="me-2">Graded</Badge>
        {card.gradingCompany && card.gradingValue && (
          <span className="fw-bold">
            {card.gradingCompany} {Number(card.gradingValue) % 1 === 0 ? Math.floor(Number(card.gradingValue)) : Number(card.gradingValue).toFixed(1)}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
        <Link to="/my-collection">
          <Button variant="primary">Back to Collection</Button>
        </Link>
      </Container>
    );
  }

  if (!card) {
    return (
      <Container>
        <Alert variant="warning">Card not found.</Alert>
        <Link to="/my-collection">
          <Button variant="primary">Back to Collection</Button>
        </Link>
      </Container>
    );
  }

  // Calcul du profit/perte pour l'affichage dans la page de détail
  const profit = card.status === 'sold' && card.soldPrice ? Number(card.soldPrice) - Number(card.price) : 0;
  const roi = card.status === 'sold' && card.soldPrice && card.price ? ((Number(card.soldPrice) - Number(card.price)) / Number(card.price)) * 100 : 0;

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <h1 style={{ 
          maxWidth: '60%', 
          wordWrap: 'break-word', 
          overflowWrap: 'break-word',
          hyphens: 'auto'
        }}>
          {card.name}
        </h1>
        <div className="d-flex flex-shrink-0">
          {card.status === 'bought' && (
            <Button 
              variant="success" 
              className="me-2" 
              onClick={() => setShowSellModal(true)}
            >
              Sell Card
            </Button>
          )}
          <Button 
            variant="outline-primary" 
            className="me-2" 
            onClick={() => setShowEditModal(true)}
          >
            Edit
          </Button>
          <Button 
            variant="outline-danger" 
            onClick={() => setShowDeleteModal(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <Row>
        <Col md={4}>
          <BootstrapCard className="mb-4">
            <BootstrapCard.Img 
              variant="top" 
              src={card.imageUrl} 
              alt={card.name}
              style={{ height: '400px', padding: '20px', objectFit: 'contain' }}
            />
          </BootstrapCard>
        </Col>
        <Col md={8}>
          <BootstrapCard>
            <BootstrapCard.Body className="p-4">
              <Row className="mb-3 text-center">
                <Col md={6} className="border-end">
                  <h5 className="mb-3">Purchase Price</h5>
                  <p className="fw-bold fs-4">${Number(card.price).toFixed(2)}</p>
                </Col>
                <Col md={6}>
                  <h5 className="mb-3">Status</h5>
                  <p>{getStatusBadge(card.status)}</p>
                </Col>
              </Row>

              {card.status === 'sold' && (
                <Row className="mb-3 text-center">
                  <Col md={6} className="border-end">
                    <h5 className="mb-3">Sold Price</h5>
                    <p className="fw-bold fs-4">${Number(card.soldPrice || card.price).toFixed(2)}</p>
                  </Col>
                  <Col md={6}>
                    <h5 className="mb-3">Profit/Loss</h5>
                    <div>
                      <p className={`fw-bold fs-4 mb-0 ${profit > 0 ? 'text-success' : (profit < 0 ? 'text-danger' : 'text-secondary')}`}>
                        ${profit.toFixed(2)}
                      </p>
                      <p className={`${roi > 0 ? 'text-success' : (roi < 0 ? 'text-danger' : 'text-secondary')}`}>
                        {roi.toFixed(2)}%
                      </p>
                    </div>
                  </Col>
                </Row>
              )}

              <hr />

              <Row className="mt-4">
                <Col md={6} className="text-center mb-3 border-end">
                  <h5 className="mb-2">Category</h5>
                  <p className="fs-5">{card.category}</p>
                </Col>
                <Col md={6} className="text-center mb-3">
                  <h5 className="mb-2">Collection</h5>
                  <p className="fs-5">{collections.find(c => c.id === card.collectionId)?.name || "Main Collection"}</p>
                </Col>
              </Row>

              <Row className="mb-3 text-center d-flex align-items-center">
                <Col md={6} className="border-end">
                  <h5 className="mb-2">Grading Status</h5>
                  {card.graded ? (
                    <Badge bg="warning">Graded</Badge>
                  ) : (
                    <Badge bg="secondary">Raw Card</Badge>
                  )}
                </Col>
                <Col md={6}>
                  <h5 className="mb-2">Grade</h5>
                  {card.graded && card.gradingCompany && card.gradingValue ? (
                    <p className="fs-5 fw-bold text-primary mb-0">
                      {card.gradingCompany} {Number(card.gradingValue) % 1 === 0 ? Math.floor(Number(card.gradingValue)) : Number(card.gradingValue).toFixed(1)}
                    </p>
                  ) : (
                    <p className="text-muted fs-5">No grading info available</p>
                  )}
                </Col>
              </Row>

              <hr className="my-4" />

              <Row className="mb-3 text-center">
                <Col md={6} className="border-end">
                  <h5 className="mb-2">Bought Date</h5>
                  {card.boughtDate ? (
                    <p className="fs-5">{formatDateWithTimezone(card.boughtDate)}</p>
                  ) : (
                    <p className="text-muted fs-5">No date recorded</p>
                  )}
                  </Col>
                <Col md={6}>
                  <h5 className="mb-2">Sold Date</h5>
                  {card.soldDate ? (
                    <p className="fs-5">{formatDateWithTimezone(card.soldDate)}</p>
                  ) : (
                    <p className="text-muted fs-5">Not sold yet</p>
                  )}
                  </Col>
                </Row>

              {card.description && (
                <Row className="mb-3 mt-3">
                  <Col>
                    <div className="bg-light p-3 rounded">
                      <h5 className="mb-2 text-center">Description</h5>
                      <p className="mb-0">{card.description}</p>
                    </div>
                  </Col>
                </Row>
              )}
            </BootstrapCard.Body>
          </BootstrapCard>
        </Col>
      </Row>

      <div className="mt-4">
        <Link to="/my-collection">
          <Button variant="secondary">Back to Collection</Button>
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
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

      {/* Edit Modal - Nouveau formulaire complet */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Card</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editValidationError && (
            <Alert variant="danger" className="mb-3">
              {editValidationError}
            </Alert>
          )}
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Card Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={editFormData.name || ''}
                    onChange={handleEditFormChange}
                    isInvalid={invalidFields.name}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Card name is required
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={editFormData.status || 'bought'}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'bought' | 'sold';
                      setEditFormData(prev => ({
                        ...prev,
                        status: newStatus,
                        // Réinitialiser les données de vente si on passe à 'bought'
                        soldPrice: newStatus === 'bought' ? undefined : prev.soldPrice,
                        soldDate: newStatus === 'bought' ? undefined : prev.soldDate
                      }));
                    }}
                    required
                  >
                    <option value="bought">In Collection (Bought)</option>
                    <option value="sold">Sold</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Changing a sold card back to "Bought" will remove all sale information
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Purchase Price ($)</Form.Label>
                  <Form.Control
                    type="number"
                    name="price"
                    value={editFormData.price || 0}
                    onChange={handleEditFormChange}
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    isInvalid={invalidFields.price}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Purchase price must be greater than 0
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Purchase Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="boughtDate"
                    value={formatDateForInput(editFormData.boughtDate)}
                    onChange={handleEditFormChange}
                    className="date-picker-visible"
                    isInvalid={invalidFields.boughtDate}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Purchase date is required
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            {editFormData.status === 'sold' && (
              <>
                <hr />
                <h5 className="mb-3">Sale Information</h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sold Price ($)</Form.Label>
                      <Form.Control
                        type="number"
                        name="soldPrice"
                        value={editFormData.soldPrice || 0}
                        onChange={handleEditFormChange}
                        step="0.01"
                        min="0.01"
                        inputMode="decimal"
                        isInvalid={invalidFields.soldPrice}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        Sold price must be greater than 0
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sold Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="soldDate"
                        value={formatDateForInput(editFormData.soldDate)}
                        onChange={handleEditFormChange}
                        className="date-picker-visible"
                        isInvalid={invalidFields.soldDate}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        Sold date must be on or after purchase date
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}

            <hr />

            <Form.Group className="mb-3">
              <Form.Label>Card Image</Form.Label>
              <div className="d-flex align-items-center mb-2">
                <div className="me-3" style={{ width: '150px', height: '210px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                  <Image 
                    src={previewUrl} 
                    alt="Card preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    onError={handleImageError}
                  />
                </div>
                <div>
                  <Form.Control
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mb-2"
                  />
                  <small className="text-muted d-block">
                    Upload an image of your card. If no image is provided, the current image will be kept.
                  </small>
                </div>
              </div>
            </Form.Group>

            <hr />
            
            <Form.Group className="mb-3">
              <Form.Label>Grading Information</Form.Label>
              <Form.Check 
                type="checkbox"
                id="edit-graded-check"
                label="Is this card graded?"
                checked={isTruthy(editFormData.graded)}
                onChange={(e) => {
                  const isGraded = e.target.checked;
                  setEditFormData(prev => ({
                    ...prev,
                    graded: isGraded,
                    // Réinitialiser les informations de grading si non gradé
                    gradingCompany: isGraded ? prev.gradingCompany : undefined,
                    gradingValue: isGraded ? prev.gradingValue : undefined
                  }));
                }}
                className="mb-3"
              />
              
              {isTruthy(editFormData.graded) ? (
                <Row className="mt-2">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Grading Company</Form.Label>
                      <Form.Select
                        name="gradingCompany"
                        value={editFormData.gradingCompany || ''}
                        onChange={(e) => {
                          const company = e.target.value as "PSA" | "BGS"; // Typage correct
                          setEditFormData(prev => ({
                            ...prev, 
                            gradingCompany: company,
                            graded: true // S'assurer que graded reste true
                          }));
                          // Réinitialiser l'erreur de validation
                          setEditValidationError(null);
                          setInvalidFields(prev => ({
                            ...prev,
                            gradingCompany: false
                          }));
                        }}
                        isInvalid={invalidFields.gradingCompany}
                        required={isTruthy(editFormData.graded)}
                      >
                        <option value="">Select a company</option>
                        <option value="PSA">PSA</option>
                        <option value="BGS">BGS</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        Grading company is required for graded cards
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Grade Value</Form.Label>
                      <Form.Select
                        name="gradingValue"
                        value={editFormData.gradingValue || ''}
                        onChange={(e) => {
                          setEditFormData(prev => ({
                            ...prev, 
                            gradingValue: Number(e.target.value),
                            graded: true // S'assurer que graded reste true
                          }));
                          // Réinitialiser l'erreur de validation
                          setEditValidationError(null);
                          setInvalidFields(prev => ({
                            ...prev,
                            gradingValue: false
                          }));
                        }}
                        isInvalid={invalidFields.gradingValue}
                        required={isTruthy(editFormData.graded)}
                      >
                        <option value="">Select a grade</option>
                        {editFormData.gradingCompany === 'PSA' 
                          ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))
                          : [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))
                        }
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        Grade value is required for graded cards
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              ) : <></>}  
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={editFormData.category || ''}
                onChange={handleEditFormChange}
                isInvalid={invalidFields.category}
                required
              >
                <option value="">Select a category</option>
                {[
                  'Baseball',
                  'Basketball',
                  'Football',
                  'Hockey',
                  'Soccer',
                  'UFC',
                  'F1',
                  'Golf',
                  'Tennis',
                  'Pokemon',
                  'Magic',
                  'Yu-Gi-Oh',
                  'Other'
                ].map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                Category is required
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Collection</Form.Label>
              {loadingCollections ? (
                <div className="d-flex align-items-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span>Loading collections...</span>
                </div>
              ) : (
                <>
                  <Form.Select
                    name="collectionId"
                    value={editFormData.collectionId || ''}
                    onChange={(e) => {
                      setEditFormData(prev => ({
                        ...prev,
                        collectionId: parseInt(e.target.value)
                      }));
                    }}
                    isInvalid={invalidFields.collectionId}
                    required
                  >
                    <option value="">Select a collection</option>
                    {collections.map((collection: Collection) => (
                      <option key={collection.id} value={collection.id}>{collection.name}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    Collection is required
                  </Form.Control.Feedback>
                </>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={editFormData.description || ''}
                onChange={handleEditFormChange}
                rows={3}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdate}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Update Card'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Sell Card Modal */}
      <Modal show={showSellModal} onHide={() => setShowSellModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Sell Card</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {sellErrorMessage && (
            <Alert variant="danger" className="mb-3">
              {sellErrorMessage}
            </Alert>
          )}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Sold Price ($)</Form.Label>
              <Form.Control 
                type="number" 
                value={soldPrice}
                onChange={(e) => setSoldPrice(parseFloat(e.target.value))}
                step="0.01"
                min="0.01"
                inputMode="decimal"
                required
              />
              <Form.Text className="text-muted">
                Use arrows for $1 increments or type any decimal amount
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sold Date</Form.Label>
              <Form.Control 
                type="date" 
                value={soldDate}
                onChange={(e) => {
                  setSoldDate(e.target.value);
                  // Réinitialiser l'erreur si l'utilisateur change la date
                  if (sellErrorMessage) setSellErrorMessage(null);
                }}
                className="date-picker-visible"
                required
              />
              {card.boughtDate && (
                <Form.Text className="text-muted">
                  Bought date: {formatDateWithTimezone(card.boughtDate)}
                </Form.Text>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSellModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleSellCard}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Confirm Sale'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CardDetailPage; 