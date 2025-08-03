import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Button, Card as BootstrapCard, Form, InputGroup, Dropdown, Badge, Modal, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaFilter, FaFileImport } from 'react-icons/fa';
import { CSSTransition } from 'react-transition-group';
import CollectionSelector from '../components/CollectionSelector';
import CardList from '../components/CardList';
import ExcelImport from '../components/ExcelImport';
import PdfExport from '../components/PdfExport';
import useCardsService from '../services/cards';
import useCategoriesService from '../services/categories';
import useCollectionsService, { Collection } from '../services/collections';
import { Card } from '../types';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';

const MyCollectionPage: React.FC = () => {
  const [selectedCollectionId, setSelectedCollectionId] = useState<number>(1);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string>('My Collection');
  const [selectedCollectionDescription, setSelectedCollectionDescription] = useState<string>('Contains every card you owned or sold by default.');
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const cardsService = useCardsService();
  const categoriesService = useCategoriesService();
  const collectionsService = useCollectionsService();
  const [gradingFilter, setGradingFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('none');
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [showMoveModal, setShowMoveModal] = useState<boolean>(false);
  const [targetCollectionId, setTargetCollectionId] = useState<number>(1);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const transitionNodeRef = useRef(null);
  const { getAccessTokenSilently, user } = useAuth0();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const isPremium = subscriptionData?.subscription?.name === 'Premium';

  // Use useCallback to memoize the loadCards function
  const loadCards = useCallback(async () => {
    let isMounted = true;
    
    try {
      setLoading(true);
      const data = await cardsService.getAllCards(selectedCollectionId);
      if (isMounted) {
        setCards(data as any);
        setFilteredCards(data as any);
        setError(null);
      }
    } catch (err) {
      console.error('Error loading cards:', err);
      if (isMounted) {
        setError('Failed to load cards. Please try again later.');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [selectedCollectionId, cardsService]);

  const fetchCollections = useCallback(async () => {
    try {
      setLoadingCollections(true);
      const collectionsData = await collectionsService.getAllCollections();
      setCollections(collectionsData);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoadingCollections(false);
    }
  }, [collectionsService]);

  // Charger les collections au démarrage
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleSelectMoveButtonClick = () => {
    fetchCollections(); // Recharger les collections avant d'ouvrir le modal
    setShowMoveModal(true);
  };

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesService.getAllCategories();
        const categoryNames = data.map(cat => cat.name);
        setCategories(categoryNames);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Charger le nom de la collection sélectionnée
  useEffect(() => {
    const fetchCollectionInfo = async () => {
      try {
        if (selectedCollectionId === 1) {
          setSelectedCollectionName('My Collection');
          setSelectedCollectionDescription('Contains every card you owned or sold by default.');
          return;
        }
        
        const collections = await collectionsService.getAllCollections();
        const selectedCollection = collections.find(c => c.id === selectedCollectionId);
        if (selectedCollection) {
          setSelectedCollectionName(selectedCollection.name);
          setSelectedCollectionDescription(selectedCollection.description || '');
        } else {
          setSelectedCollectionName('My Collection');
          setSelectedCollectionDescription('Contains every card you owned or sold by default.');
        }
      } catch (error) {
        console.error('Error fetching collection info:', error);
        setSelectedCollectionName('My Collection');
        setSelectedCollectionDescription('Contains every card you owned or sold by default.');
      }
    };
    
    fetchCollectionInfo();
  }, [selectedCollectionId, collectionsService]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Filter cards based on search term, status filter, and category filter
  const applyFilters = useCallback(() => {
    let result = [...cards];
    
    // Filtrer les cartes
    if (searchTerm) {
      result = result.filter(card => 
        card.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(card => card.status === statusFilter);
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(card => card.category === categoryFilter);
    }
    
    if (gradingFilter !== 'all') {
      result = result.filter(card => 
        gradingFilter === 'graded' ? (card.graded === true || card.graded === 1) : (card.graded !== true && card.graded !== 1)
      );
    }
    
    // Trier les cartes
    if (sortField !== 'none') {
      result.sort((a, b) => {
        if (sortField === 'price_asc') {
          return a.price - b.price;
        } else if (sortField === 'price_desc') {
          return b.price - a.price;
        }
        return 0;
      });
    }
    
    setFilteredCards(result);
  }, [cards, searchTerm, statusFilter, categoryFilter, gradingFilter, sortField]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const getCollectionStats = () => {
    // Si c'est la collection principale, utiliser toutes les cartes pour les statistiques
    if (selectedCollectionId === 1) {
      const boughtCards = cards.filter(card => card.status === 'bought');
      const soldCards = cards.filter(card => card.status === 'sold');
      const gradedCards = cards.filter(card => card.graded === true || card.graded === 1);
      const rawCards = cards.filter(card => card.graded !== true && card.graded !== 1);
      
      return {
        total: cards.length,
        bought: boughtCards.length,
        sold: soldCards.length,
        graded: gradedCards.length,
        raw: rawCards.length,
        value: boughtCards.length > 0 ? boughtCards.reduce((sum, card) => sum + (Number(card.price) || 0), 0).toFixed(2) : "0.00"
      };
    } else {
      // Sinon, calculer les stats seulement pour la collection sélectionnée
      const boughtCards = cards.filter(card => card.status === 'bought');
      const soldCards = cards.filter(card => card.status === 'sold');
      const gradedCards = cards.filter(card => card.graded === true || card.graded === 1);
      const rawCards = cards.filter(card => card.graded !== true && card.graded !== 1);
      
      return {
        total: cards.length,
        bought: boughtCards.length,
        sold: soldCards.length,
        graded: gradedCards.length,
        raw: rawCards.length,
        value: boughtCards.length > 0 ? boughtCards.reduce((sum, card) => sum + (Number(card.price) || 0), 0).toFixed(2) : "0.00"
      };
    }
  };

  const stats = getCollectionStats();

  // Get unique categories from cards
  const getUniqueCategories = () => {
    const uniqueCategories = new Set<string>();
    cards.forEach(card => {
      if (card.category) {
        uniqueCategories.add(card.category);
      }
    });
    return Array.from(uniqueCategories);
  };

  const uniqueCategories = getUniqueCategories();

  const handleImportSuccess = (importedCards: Card[]) => {
    // Add the imported cards to the current cards list
    const updatedCards = [...importedCards, ...cards];
    setCards(updatedCards);
    
    // Apply current filters to the updated cards list
    const filtered = updatedCards.filter(card => {
      // Apply status filter
      if (statusFilter !== 'all' && card.status !== statusFilter) {
        return false;
      }
      
      // Apply category filter
      if (categoryFilter !== 'all' && card.category !== categoryFilter) {
        return false;
      }
      
      // Apply search term
      if (searchTerm && !card.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    setFilteredCards(filtered);
  };

  const handleCardSelection = (cardId: number) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedCards.length === 0) return;
    
    try {
      for (const cardId of selectedCards) {
        await cardsService.deleteCard(cardId);
      }
      setSelectedCards([]);
      setShowDeleteModal(false);
      loadCards();
    } catch (error) {
      console.error('Error deleting cards:', error);
      setError('Failed to delete selected cards. Please try again.');
    }
  };

  const handleMoveSelected = async () => {
    if (selectedCards.length === 0 || !targetCollectionId) return;
    
    try {
      for (const cardId of selectedCards) {
        const card = cards.find(c => c.id === cardId);
        if (card) {
          await cardsService.updateCard(cardId, {
            ...card,
            collectionId: targetCollectionId
          });
        }
      }
      setSelectedCards([]);
      setShowMoveModal(false);
      setMultiSelectMode(false);
      loadCards();
    } catch (error) {
      console.error('Error moving cards:', error);
      setError('Failed to move selected cards. Please try again.');
    }
  };

  const handleAddCard = async (cardData: any) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post('http://localhost:3001/api/cards', cardData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': user?.sub
        }
      });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    } catch (error: any) {
      if (error.response?.data?.redirectTo) {
        navigate(error.response.data.redirectTo);
      } else {
        console.error('Error adding card:', error);
      }
    }
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center my-4">
        <h1>My Collection</h1>
        <div>
          <PdfExport 
            cards={filteredCards} 
            collectionName={selectedCollectionName}
          />
          <Button 
            variant="outline-primary" 
            className="me-2"
            onClick={() => setShowImportModal(true)}
            disabled={!isPremium}
            title={!isPremium ? "Import Excel disponible uniquement pour les utilisateurs Premium" : ""}
          >
            <FaFileImport className="me-1" /> Import
          </Button>
          <Link to="/statistics" className="me-2">
            <Button variant="outline-primary">View Statistics</Button>
          </Link>
          <Link to="/add-card">
            <Button variant="primary">Add New Card</Button>
          </Link>
        </div>
      </div>

      <CollectionSelector 
        selectedCollectionId={selectedCollectionId} 
        onCollectionChange={setSelectedCollectionId} 
      />

      <BootstrapCard className="mb-4 mt-4">
        <BootstrapCard.Body>
          <Row className="mb-3 justify-content-center">
            <Col md={3} className="text-center">
              <h5>Total Cards</h5>
              <h2>{stats.total}</h2>
            </Col>
            <Col md={3} className="text-center">
              <h5>In Collection</h5>
              <h2>{stats.bought}</h2>
            </Col>
            <Col md={3} className="text-center">
              <h5>Sold</h5>
              <h2>{stats.sold}</h2>
            </Col>
          </Row>
          <Row className="justify-content-center">
            <Col md={4} className="text-center">
              <h5>Graded Cards</h5>
              <h2><Badge bg="warning">{stats.graded}</Badge></h2>
            </Col>
            <Col md={4} className="text-center">
              <h5>Raw Cards</h5>
              <h2><Badge bg="secondary">{stats.raw}</Badge></h2>
            </Col>
          </Row>
        </BootstrapCard.Body>
      </BootstrapCard>

      <div className="d-flex justify-content-center align-items-center my-4">
        <InputGroup className="me-2" style={{ width: '300px' }}>
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        <Dropdown className="me-2">
          <Dropdown.Toggle variant="outline-secondary" className="me-2">
            <FaFilter className="me-1" /> Status: {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</Dropdown.Item>
            <Dropdown.Item active={statusFilter === 'bought'} onClick={() => setStatusFilter('bought')}>Bought</Dropdown.Item>
            <Dropdown.Item active={statusFilter === 'sold'} onClick={() => setStatusFilter('sold')}>Sold</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" className="me-2">
            <FaFilter className="me-1" /> Grading: {gradingFilter === 'all' ? 'All' : gradingFilter.charAt(0).toUpperCase() + gradingFilter.slice(1)}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item active={gradingFilter === 'all'} onClick={() => setGradingFilter('all')}>All</Dropdown.Item>
            <Dropdown.Item active={gradingFilter === 'graded'} onClick={() => setGradingFilter('graded')}>Graded</Dropdown.Item>
            <Dropdown.Item active={gradingFilter === 'raw'} onClick={() => setGradingFilter('raw')}>Raw</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" id="dropdown-category">
            <FaFilter className="me-2" />
            {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setCategoryFilter('all')}>All Categories</Dropdown.Item>
            {getUniqueCategories().map((category) => (
              <Dropdown.Item key={category} onClick={() => setCategoryFilter(category)}>
                {category}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>

      <div className="d-flex justify-content-center align-items-center mb-3">
        <div>
          <Badge bg="info" className="me-2">
            {filteredCards.length} cards found
          </Badge>
          {searchTerm && (
            <Badge bg="primary" className="me-2">
              Search: {searchTerm}
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge bg="success" className="me-2">
              Status: {statusFilter === 'bought' ? 'Bought' : 'Sold'}
            </Badge>
          )}
          {categoryFilter !== 'all' && (
            <Badge bg="warning" className="me-2">
              Category: {categoryFilter}
            </Badge>
          )}
          {gradingFilter !== 'all' && (
            <Badge bg="secondary" className="me-2">
              Grading: {gradingFilter === 'graded' ? 'Graded' : 'Raw'}
            </Badge>
          )}
          {sortField !== 'none' && (
            <Badge bg="dark" className="me-2">
              Sort: {sortField === 'price_asc' ? 'Price (Low to High)' : 'Price (High to Low)'}
            </Badge>
          )}
        </div>
        {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || gradingFilter !== 'all' || sortField !== 'none') && (
          <Button 
            variant="outline-secondary" 
            size="sm"
            className="ms-3"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setCategoryFilter('all');
              setGradingFilter('all');
              setSortField('none');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" className="me-2">
            <i className="fas fa-sort me-1"></i> Sort by Price
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item active={sortField === 'none'} onClick={() => setSortField('none')}>No Sorting</Dropdown.Item>
            <Dropdown.Item active={sortField === 'price_asc'} onClick={() => setSortField('price_asc')}>Price (Low to High)</Dropdown.Item>
            <Dropdown.Item active={sortField === 'price_desc'} onClick={() => setSortField('price_desc')}>Price (High to Low)</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
        
        <div className="d-flex align-items-center multi-select-container">
          <div className="multi-select-toggle" style={{ marginRight: '30px' }}>
            <Form.Check 
              type="switch"
              id="multi-select-switch"
              label={<span style={{ 
                fontSize: '1.1rem', 
                fontWeight: 'bold', 

                display: 'inline-block'
              }}>Multi-Select Mode</span>}
              checked={multiSelectMode}
              onChange={(e) => {
                setMultiSelectMode(e.target.checked);
                if (!e.target.checked) {
                  setSelectedCards([]);
                }
              }}
              style={{ transform: 'scale(1.2)'}}
            />
          </div>
          
          <CSSTransition
            in={multiSelectMode}
            timeout={300}
            classNames="fade"
            unmountOnExit
            nodeRef={transitionNodeRef}
          >
            <div className="d-flex align-items-center" ref={transitionNodeRef}>
              <Badge bg="info" className="me-2" style={{ padding: '8px 10px', fontSize: '0.8rem' }}>
                {selectedCards.length} cards selected
              </Badge>
              <Button 
                variant="danger" 
                size="sm" 
                className="me-2"
                disabled={selectedCards.length === 0}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Selected
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                disabled={selectedCards.length === 0}
                onClick={handleSelectMoveButtonClick}
              >
                Move to Collection
              </Button>
            </div>
          </CSSTransition>
        </div>
      </div>

      {filteredCards.length === 0 && !loading && !error ? (
        <div className="alert alert-info">
          No cards found matching your filters. Try adjusting your search criteria.
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <CardList 
          cards={filteredCards} 
          onCardDeleted={loadCards} 
          multiSelectMode={multiSelectMode}
          selectedCards={selectedCards}
          onCardSelect={handleCardSelection}
        />
      )}

      {/* Excel Import Modal */}
      <ExcelImport 
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
        collectionId={selectedCollectionId}
      />

      {/* Delete Selected Cards Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete {selectedCards.length} selected cards? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteSelected}>
            Delete Cards
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Move Selected Cards Modal */}
      <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Move Cards to Collection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Select the destination collection for {selectedCards.length} cards:</p>
          <Form.Group>
            <Form.Label>Destination Collection</Form.Label>
            {loadingCollections ? (
              <div className="d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-2" />
                <span>Loading collections...</span>
              </div>
            ) : (
              <>
                <Form.Select
                  value={targetCollectionId}
                  onChange={(e) => setTargetCollectionId(Number(e.target.value))}
                >
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  Please select a collection
                </Form.Control.Feedback>
              </>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMoveModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleMoveSelected}>
            Move Cards
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyCollectionPage; 