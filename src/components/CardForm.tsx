import { useState, useEffect, useRef } from 'react';
import { Form, Button, Row, Col, Image, Alert, Spinner } from 'react-bootstrap';
import { Card } from '../types';
import useCategoriesService from '../services/categories';
import useCollectionsService from '../services/collections';
import useAuthContext from '../hooks/useAuthContext';
import { API_BASE_URL, DEFAULT_IMAGE_URL } from '../config';

interface CardFormProps {
  initialValues?: Partial<Card>;
  onSubmit: (card: Omit<Card, 'id'>) => void;
  isSubmitting?: boolean;
  disableBoughtDateEdit?: boolean;
}

// Fonction pour obtenir la date d'aujourd'hui au format ISO
function getTodayISODate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

const CardForm = ({ initialValues, onSubmit, isSubmitting = false, disableBoughtDateEdit = false }: CardFormProps) => {
  const { user } = useAuthContext();
  const [formData, setFormData] = useState<Omit<Card, 'id'>>({
    name: '',
    price: 0,
    soldPrice: undefined,
    imageUrl: DEFAULT_IMAGE_URL,
    status: 'bought',
    description: '',
    category: 'Other',
    collectionId: 1,
    userId: 'anonymous-user',
    createdAt: getTodayISODate(),
    boughtDate: getTodayISODate(),
    graded: false,
    gradingCompany: undefined,
    gradingValue: undefined,
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialValues?.imageUrl || DEFAULT_IMAGE_URL);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNewCard = !initialValues?.id;
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [collections, setCollections] = useState<{id: number, name: string}[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const categoriesService = useCategoriesService();
  const collectionsService = useCollectionsService();

  // Ajouter un état pour suivre les champs invalides
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) {
      const isGraded = Boolean(initialValues.graded);
      setFormData(prev => ({
        ...prev,
        ...initialValues,
        price: Number(initialValues.price) || 0,
        soldPrice: initialValues.soldPrice ? Number(initialValues.soldPrice) : undefined,
        graded: isGraded,
        gradingCompany: isGraded ? initialValues.gradingCompany : undefined,
        gradingValue: isGraded && initialValues.gradingValue ? Number(initialValues.gradingValue) : undefined,
        boughtDate: initialValues.boughtDate ? initialValues.boughtDate.split('T')[0] : getTodayISODate(),
        soldDate: initialValues.soldDate ? initialValues.soldDate.split('T')[0] : undefined,
      }));
      setPreviewUrl(initialValues.imageUrl || DEFAULT_IMAGE_URL);
    }
  }, [initialValues]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const data = await categoriesService.getAllCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoadingCollections(true);
        const data = await collectionsService.getAllCollections();
        setCollections(data);
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchCollections();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      // Pour les checkbox, on utilise l'assertion de type pour HTMLInputElement
      const checkboxElement = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkboxElement.checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? '' : parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Réinitialiser l'erreur de validation et marquer le champ comme valide
    setValidationError(null);
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
      const uploadData = new FormData();
      uploadData.append('image', file);

      try {
        console.log('Uploading image...');
        console.log('User ID:', user?.id);
        
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'x-user-id': user?.id || ''
          },
          body: uploadData
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
        setFormData(prev => ({
          ...prev,
          imageUrl: imageUrl
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        // En cas d'erreur, garder l'image par défaut
        setFormData(prev => ({
          ...prev,
          imageUrl: DEFAULT_IMAGE_URL
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Réinitialiser les champs invalides
    const newInvalidFields: Record<string, boolean> = {};
    let hasError = false;
    
    // Validation de base
    if (!formData.name) {
      newInvalidFields.name = true;
      setValidationError("Card name is required");
      hasError = true;
    }
    
    if (!formData.price || formData.price <= 0) {
      newInvalidFields.price = true;
      setValidationError("Purchase price must be greater than 0");
      hasError = true;
    }
    
    if (!formData.boughtDate) {
      newInvalidFields.boughtDate = true;
      setValidationError("Purchase date is required");
      hasError = true;
    }
    
    if (!formData.category) {
      newInvalidFields.category = true;
      setValidationError("Category is required");
      hasError = true;
    }
    
    // Validation des dates
    if (formData.boughtDate && formData.soldDate) {
      const boughtDate = new Date(formData.boughtDate);
      const soldDate = new Date(formData.soldDate);
      
      // Ajuster les dates pour ignorer l'heure
      boughtDate.setHours(0, 0, 0, 0);
      soldDate.setHours(0, 0, 0, 0);
      
      if (soldDate < boughtDate) {
        newInvalidFields.soldDate = true;
        setValidationError("Sold date cannot be earlier than bought date");
        hasError = true;
      }
    }
    
    // Validation du grading
    const isGraded = Boolean(formData.graded);
    if (isGraded) {
      if (!formData.gradingCompany) {
        newInvalidFields.gradingCompany = true;
        setValidationError("Grading company is required for graded cards");
        hasError = true;
      }
      if (!formData.gradingValue) {
        newInvalidFields.gradingValue = true;
        setValidationError("Grade value is required for graded cards");
        hasError = true;
      }
    }
    
    setInvalidFields(newInvalidFields);
    
    if (hasError) {
      return;
    }
    
    // Préparer les données pour la soumission
    const submissionData = {
      ...formData,
      price: Number(formData.price),
      soldPrice: formData.soldPrice ? Number(formData.soldPrice) : undefined,
      graded: isGraded,
      gradingCompany: isGraded ? formData.gradingCompany : undefined,
      gradingValue: isGraded && formData.gradingValue ? Number(formData.gradingValue) : undefined,
      boughtDate: formData.boughtDate.split('T')[0],
      soldDate: formData.soldDate ? formData.soldDate.split('T')[0] : undefined,
    };
    
    onSubmit(submissionData);
  };

  // Gérer les erreurs d'image en utilisant l'image par défaut
  const handleImageError = () => {
    setPreviewUrl(DEFAULT_IMAGE_URL);
    setFormData(prev => ({
      ...prev,
      imageUrl: DEFAULT_IMAGE_URL
    }));
  };

  const fallbackCategories = [
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
  ];

  // Fonction pour formater une date ISO en valeur de champ date
  // Ne modifie que l'affichage, pas les données envoyées au serveur
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    
    // S'assurer que nous avons seulement la partie date (YYYY-MM-DD) pour l'input HTML
    return dateString.split('T')[0];
  };

  return (
    <Form onSubmit={handleSubmit}>
      {validationError && (
        <Alert variant="danger" className="mb-3">
          {validationError}
        </Alert>
      )}
    
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Card Name</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex : Connor McDavid young guns"
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
            <Form.Label>Purchase Price ($)</Form.Label>
            <Form.Control
              type="number"
              name="price"
              value={formData.price === 0 ? '' : formData.price}
              placeholder="0"
              onChange={handleChange}
              step="1"
              min="0"
              inputMode="decimal"
              isInvalid={invalidFields.price}
              required
            />
            <Form.Control.Feedback type="invalid">
              Purchase price must be greater than 0
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

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
              Upload an image of your card. If no image is provided, a default image will be used.
            </small>
          </div>
        </div>
      </Form.Group>

      {isNewCard && (
        <Alert variant="info">
          <div className="d-flex align-items-center">
            <div>
              <strong>Status:</strong> New cards are automatically added to your collection as "Bought"
            </div>
          </div>
        </Alert>
      )}

      {!isNewCard && (
        <Alert variant="info">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Status:</strong> {formData.status === 'bought' ? 'In Collection' : 'Sold'}
            </div>
            {formData.status === 'bought' && (
              <div className="text-muted small">
                To sell this card, use the "Sell Card" button on the card details page.
              </div>
            )}
          </div>
        </Alert>
      )}

      <Row>
        <Col md={6}>
          {(formData.status === 'bought' || isNewCard) && (
            <Form.Group className="mb-3">
              <Form.Label>Bought Date</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type="date"
                  id="boughtDate"
                  name="boughtDate"
                  value={formData.boughtDate ? formatDateForInput(formData.boughtDate) : ''}
                  onChange={handleChange}
                  className="date-picker-visible"
                  disabled={disableBoughtDateEdit}
                  isInvalid={invalidFields.boughtDate}
                />
                <Form.Control.Feedback type="invalid">
                  Purchase date is required
                </Form.Control.Feedback>
              </div>
            </Form.Group>
          )}
          {formData.status === 'sold' && !isNewCard && (
            <Form.Group className="mb-3">
              <Form.Label>Sold Price ($)</Form.Label>
              <Form.Control
                type="number"
                name="soldPrice"
                value={formData.soldPrice || formData.price}
                onChange={handleChange}
                step="1"
                min="0"
                inputMode="decimal"
                required
              />
              <Form.Text className="text-muted">
                Use arrows for $1 increments or type any decimal amount
              </Form.Text>
            </Form.Group>
          )}
        </Col>
        <Col md={6}>
          {formData.status === 'sold' && !isNewCard && (
            <Form.Group className="mb-3">
              <Form.Label>Sold Date</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type="date"
                  name="soldDate"
                  value={formData.soldDate ? formatDateForInput(formData.soldDate) : ''}
                  onChange={handleChange}
                  className="date-picker-visible"
                  isInvalid={invalidFields.soldDate}
                />
                <Form.Control.Feedback type="invalid">
                  Sold date cannot be earlier than bought date
                </Form.Control.Feedback>
              </div>
            </Form.Group>
          )}
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Category</Form.Label>
            {loadingCategories ? (
              <div className="d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-2" />
                <span>Loading categories...</span>
              </div>
            ) : (
              <>
                <Form.Select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleChange}
                  isInvalid={invalidFields.category}
                  required
                >
                  <option value="">Select a category</option>
                  {(categories.length > 0 ? categories : fallbackCategories.map(name => ({ id: 0, name }))).map((category, index) => (
                    <option key={category.id || index} value={category.name}>{category.name}</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  Category is required
                </Form.Control.Feedback>
              </>
            )}
            <Form.Text className="text-muted">
              Category is required for all cards
            </Form.Text>
          </Form.Group>
        </Col>
        <Col md={6}>
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
                  value={formData.collectionId || 1}
                  onChange={(e) => {
                    const newCollectionId = Number(e.target.value);
                    setFormData({
                      ...formData,
                      collectionId: newCollectionId
                    });
                  }}
                  isInvalid={invalidFields.collectionId}
                  required
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
            <Form.Text className="text-muted">
              Select which collection this card belongs to
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label>Grading Information</Form.Label>
            <Form.Check 
              type="checkbox"
              id="graded-check"
              label="Is this card graded?"
              checked={Boolean(formData.graded)}
              onChange={(e) => setFormData({...formData, graded: e.target.checked})}
              className="mb-2"
            />
            
            {Boolean(formData.graded) && (
              <Row className="mt-2">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Grading Company</Form.Label>
                    <Form.Select
                      name="gradingCompany"
                      value={formData.gradingCompany || ''}
                      onChange={handleChange}
                      isInvalid={invalidFields.gradingCompany}
                      required={Boolean(formData.graded)}
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
                      value={formData.gradingValue || ''}
                      onChange={(e) => {
                        setFormData({...formData, gradingValue: Number(e.target.value)});
                        // Réinitialiser l'erreur de validation et marquer le champ comme valide
                        setValidationError(null);
                        setInvalidFields(prev => ({
                          ...prev,
                          gradingValue: false
                        }));
                      }}
                      isInvalid={invalidFields.gradingValue}
                      required={Boolean(formData.graded)}
                    >
                      <option value="">Select a grade</option>
                      {formData.gradingCompany === 'PSA' 
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
            )}
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label>Description</Form.Label>
        <Form.Control
          as="textarea"
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={3}
        />
      </Form.Group>

      <Button variant="primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : initialValues?.id ? 'Update Card' : 'Add Card'}
      </Button>
    </Form>
  );
};

export default CardForm; 