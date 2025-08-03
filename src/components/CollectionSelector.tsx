import React, { useState, useEffect } from 'react';
import { Dropdown, Button, Modal, Form, InputGroup, Badge, Alert } from 'react-bootstrap';
import { FaPlus, FaTrash, FaEllipsisV } from 'react-icons/fa';
import useCollectionsService, { Collection } from '../services/collections';
import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface CollectionSelectorProps {
  selectedCollectionId?: number;
  onCollectionChange: (collectionId: number) => void;
}

const CollectionSelector: React.FC<CollectionSelectorProps> = ({
  selectedCollectionId,
  onCollectionChange,
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCollectionsActionModal, setShowCollectionsActionModal] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { getAccessTokenSilently, user } = useAuth0();
  const navigate = useNavigate();

  const collectionsService = useCollectionsService();

  // Vérifier la souscription de l'utilisateur
  const { data: subscriptionData } = useQuery({
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

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      console.log('Loading collections...');
      const data = await collectionsService.getAllCollections();
      console.log('Collections loaded:', data);
      setCollections(data);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('CollectionSelector mounted, loading collections...');
    loadCollections();
  }, []);

  // Ajouter un effet pour gérer la sélection initiale
  useEffect(() => {
    if (collections.length > 0 && !selectedCollectionId) {
      console.log('No collection selected, selecting first collection:', collections[0]);
      onCollectionChange(collections[0].id);
    }
  }, [collections, selectedCollectionId, onCollectionChange]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!isPremium) {
        navigate('/subscription');
        return;
      }

      console.log('Creating new collection:', { name: newCollectionName, description: newCollectionDescription });
      const newCollection = await collectionsService.createCollection(newCollectionName, newCollectionDescription);
      console.log('New collection created:', newCollection);
      
      setShowNewCollectionModal(false);
      setNewCollectionName('');
      setNewCollectionDescription('');
      await loadCollections();
      
      // Sélectionner automatiquement la nouvelle collection
      if (newCollection && newCollection.id) {
        console.log('Selecting new collection:', newCollection.id);
        onCollectionChange(newCollection.id);
      }
    } catch (error: any) {
      console.error('Error creating collection:', error);
      if (error.response?.data?.redirectTo) {
        navigate(error.response.data.redirectTo);
      }
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionToDelete || collectionToDelete.id === 1) return;
    
    try {
      await collectionsService.deleteCollection(collectionToDelete.id);
      
      // Si la collection supprimée était la collection sélectionnée,
      // sélectionner la collection principale (id=1)
      if (selectedCollectionId === collectionToDelete.id) {
        onCollectionChange(1);
      }
      
      setShowDeleteModal(false);
      loadCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const confirmDelete = (collection: Collection) => {
    setCollectionToDelete(collection);
    setShowDeleteModal(true);
  };

  const selectedCollection = collections.find(c => c.id === selectedCollectionId) || collections[0];

  const getCollectionDescription = () => {
    if (selectedCollectionId === 1) {
      return "Contains every card you owned or sold by default.";
    } else if (selectedCollection?.description) {
      return selectedCollection.description;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="d-flex align-items-center">
        <div className="spinner-border spinner-border-sm me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span>Loading collections...</span>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center p-3">
        <p className="text-muted mb-2">No collections found</p>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={() => setShowNewCollectionModal(true)}
          disabled={!isPremium}
        >
          <FaPlus className="me-1" /> Create Collection
          {!isPremium && <span className="ms-2 text-muted">(Premium only)</span>}
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h2 className="h4 mb-2">
        Current Collection: <Badge bg="info">{selectedCollection?.name || 'Main Collection'}</Badge>
      </h2>
      
      {getCollectionDescription() && (
        <p className="text-muted mb-3">
          <small>{getCollectionDescription()}</small>
        </p>
      )}
      
      <div className="d-flex align-items-center">
        <div className="d-flex align-items-stretch mt-2">
          <Dropdown className="me-2">
            <Dropdown.Toggle variant="outline-primary" id="collection-dropdown" className="h-100">
              Select Collection
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {collections.map(collection => (
                <Dropdown.Item
                  key={collection.id}
                  onClick={() => onCollectionChange(collection.id)}
                  active={collection.id === selectedCollectionId}
                >
                  {collection.name}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          <Button 
            variant="outline-success" 
            onClick={() => setShowNewCollectionModal(true)}
            className="d-flex align-items-center h-100 me-2"
            disabled={!isPremium}
          >
            <FaPlus className="me-1" /> Add Collection
            {!isPremium && <span className="ms-2 text-muted">(Premium only)</span>}
          </Button>
          
          {selectedCollectionId !== 1 && (
            <Button 
              variant="outline-danger" 
              onClick={() => confirmDelete(selectedCollection)}
              className="d-flex align-items-center h-100"
              disabled={!isPremium}
            >
              <FaTrash className="me-1" /> Delete Collection
              {!isPremium && <span className="ms-2 text-muted">(Premium only)</span>}
            </Button>
          )}
        </div>
      </div>

      {/* Modal pour créer une nouvelle collection */}
      <Modal show={showNewCollectionModal} onHide={() => setShowNewCollectionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Collection</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateCollection}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Collection Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter collection description"
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNewCollectionModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Collection
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal pour confirmer la suppression */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Collection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the collection "{collectionToDelete?.name}"?</p>
          <Alert variant="warning">
            <strong>Note:</strong> All cards in this collection will be moved to the Main Collection, not deleted.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteCollection}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CollectionSelector; 