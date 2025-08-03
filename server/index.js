const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const DEFAULT_IMAGE_URL = '/default-card.jpg';

// Configuration de la base de données PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-url.onrender.com'] // À remplacer par votre URL frontend
    : ['http://localhost:5173'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.use(express.json());

// Configure uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files - this should be before all routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Saving file to:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = uniqueSuffix + ext;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    console.log('Received file:', file.originalname, 'type:', file.mimetype);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG & GIF files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Configure multer for Excel uploads
const excelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const uploadExcel = multer({ 
  storage: excelStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only Excel files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Middleware to verify user from Auth0
const verifyUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - User ID required' });
  }
  req.userId = userId;
  next();
};

// API Routes
app.get('/api/cards', verifyUser, async (req, res) => {
  try {
    const { collectionId } = req.query;
    let query = 'SELECT * FROM cards WHERE user_id = $1';
    const params = [req.userId];

      if (collectionId) {
      query += ' AND collection_id = $2';
      params.push(collectionId);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get a specific card by ID
app.get('/api/cards/:id', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM cards WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = result.rows[0];
    
    // Ensure proper type conversion for all fields
    const formattedCard = {
      ...card,
      graded: Boolean(card.graded),
      gradingValue: card.grading_value !== null ? Number(card.grading_value) : null,
      gradingCompany: card.grading_company || null,
      boughtDate: card.bought_date instanceof Date ? card.bought_date.toISOString().split('T')[0] : card.bought_date,
      soldDate: card.sold_date instanceof Date ? card.sold_date.toISOString().split('T')[0] : card.sold_date,
      price: Number(card.price),
      soldPrice: card.sold_price !== null ? Number(card.sold_price) : null
    };
    
    res.json(formattedCard);
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

app.post('/api/cards', verifyUser, async (req, res) => {
  try {
    const { 
      name, price, soldPrice, imageUrl, status, boughtDate, soldDate, 
      description, category, collectionId,
      graded, gradingCompany, gradingValue
    } = req.body;
    
    // Validation de base
    if (!name || !price || !boughtDate || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validation des dates
    if (soldDate) {
      const boughtDateObj = new Date(boughtDate);
      const soldDateObj = new Date(soldDate);
      
      // Ajuster les dates pour ignorer l'heure
      boughtDateObj.setHours(0, 0, 0, 0);
      soldDateObj.setHours(0, 0, 0, 0);
      
      if (soldDateObj < boughtDateObj) {
        return res.status(400).json({ error: 'Sold date cannot be earlier than bought date' });
      }
    }

    // Validation du grading
    const isGraded = graded === true || graded === 1 || graded === 'true' || graded === '1';
    const finalGradingCompany = isGraded ? gradingCompany : null;
    const finalGradingValue = isGraded && gradingValue ? Number(gradingValue) : null;

    if (isGraded && (!gradingCompany || !gradingValue)) {
      return res.status(400).json({ error: 'Grading company and value are required for graded cards' });
    }

    const query = `
      INSERT INTO cards (
        name, price, sold_price, image_url, status, bought_date, sold_date,
        description, category, collection_id, user_id,
        graded, grading_company, grading_value
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;

    const values = [
      name,
      price,
      soldPrice || null,
      imageUrl || DEFAULT_IMAGE_URL,
      status || 'bought',
      boughtDate,
      soldDate || null,
      description || null,
      category,
      collectionId || 1,
      req.userId,
      isGraded,
      finalGradingCompany,
      finalGradingValue
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

app.put('/api/cards/:id', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, price, soldPrice, imageUrl, status, boughtDate, soldDate, 
      description, category, collectionId,
      graded, gradingCompany, gradingValue
    } = req.body;
    
    // Validation de base
    if (!name || !price || !boughtDate || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validation des dates
    if (soldDate) {
      const boughtDateObj = new Date(boughtDate);
      const soldDateObj = new Date(soldDate);
      
      // Ajuster les dates pour ignorer l'heure
      boughtDateObj.setHours(0, 0, 0, 0);
      soldDateObj.setHours(0, 0, 0, 0);
      
      if (soldDateObj < boughtDateObj) {
        return res.status(400).json({ error: 'Sold date cannot be earlier than bought date' });
      }
    }

    // Validation du grading
    const isGraded = graded === true || graded === 1 || graded === 'true' || graded === '1';
    const finalGradingCompany = isGraded ? gradingCompany : null;
    const finalGradingValue = isGraded && gradingValue ? Number(gradingValue) : null;

    if (isGraded && (!gradingCompany || !gradingValue)) {
      return res.status(400).json({ error: 'Grading company and value are required for graded cards' });
    }

    const query = `
      UPDATE cards
      SET name = $1, price = $2, sold_price = $3, image_url = $4,
          status = $5, bought_date = $6, sold_date = $7,
          description = $8, category = $9, collection_id = $10,
          graded = $11, grading_company = $12, grading_value = $13
      WHERE id = $14 AND user_id = $15
      RETURNING *
    `;

    const values = [
      name,
      price,
      soldPrice || null,
      imageUrl || DEFAULT_IMAGE_URL,
      status || 'bought',
      boughtDate,
      soldDate || null,
      description || null,
      category,
      collectionId || 1,
      isGraded,
      finalGradingCompany,
      finalGradingValue,
      id,
      req.userId
    ];

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

app.delete('/api/cards/:id', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [id, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Collections routes
app.get('/api/collections', verifyUser, async (req, res) => {
  try {
    // Récupérer la Main Collection
    const mainCollectionQuery = 'SELECT * FROM collections WHERE id = 1';
    const mainCollectionResult = await pool.query(mainCollectionQuery);
    const mainCollection = mainCollectionResult.rows[0];

    // Récupérer les collections de l'utilisateur
    const userCollectionsQuery = 'SELECT * FROM collections WHERE user_id = $1 AND id != 1';
    const userCollectionsResult = await pool.query(userCollectionsQuery, [req.userId]);
    const userCollections = userCollectionsResult.rows;

    // Combiner les collections
    const allCollections = [mainCollection, ...userCollections];
    res.json(allCollections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

app.post('/api/collections', verifyUser, async (req, res) => {
  try {
    // Vérifier si l'utilisateur a un abonnement premium
    const subscriptionQuery = `
      SELECT st.name as subscription_type
      FROM user_subscriptions us
      JOIN subscription_types st ON st.id = us.subscription_type_id
      WHERE us.user_id = $1 
      AND us.status = 'active'
      AND (us.end_date IS NULL OR us.end_date >= CURRENT_DATE)
      ORDER BY us.created_at DESC
      LIMIT 1
    `;
    
    const subscriptionResult = await pool.query(subscriptionQuery, [req.userId]);
    const isPremium = subscriptionResult.rows[0]?.subscription_type === 'premium';

    if (!isPremium) {
      return res.status(403).json({ 
        error: 'La création de collections est réservée aux utilisateurs premium',
        redirectTo: '/subscription'
      });
    }

    const { name, description } = req.body;
    const query = `
      INSERT INTO collections (name, description, user_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, req.userId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

app.put('/api/collections/:id', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    // Vérifier si c'est la Main Collection
    if (id === '1') {
      return res.status(403).json({ error: 'Cannot modify the Main Collection' });
    }

    const query = `
      UPDATE collections
      SET name = $1, description = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, id, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

app.delete('/api/collections/:id', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si c'est la Main Collection
    if (id === '1') {
      return res.status(403).json({ error: 'Cannot delete the Main Collection' });
    }
    
    // Vérifier si la collection contient des cartes
    const cardsQuery = 'SELECT COUNT(*) as count FROM cards WHERE collection_id = $1';
    const cardsResult = await pool.query(cardsQuery, [id]);
    
    if (cardsResult.rows[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete collection that contains cards' 
      });
    }
    
    const query = 'DELETE FROM collections WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [id, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// Image upload route
app.post('/api/upload', verifyUser, upload.single('image'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('User ID:', req.userId);
    console.log('Headers:', req.headers);
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('File uploaded:', req.file);
    const imageUrl = `/uploads/${req.file.filename}`;
    console.log('Image URL:', imageUrl);
    
    // Test if file exists
    const filePath = path.join(uploadsDir, req.file.filename);
    if (!fs.existsSync(filePath)) {
      console.error('File not saved:', filePath);
      return res.status(500).json({ error: 'File not saved correctly' });
    }
    
    // Vérifier que le fichier est bien une image
    const fileType = req.file.mimetype;
    if (!fileType.startsWith('image/')) {
      console.error('Invalid file type:', fileType);
      fs.unlinkSync(filePath); // Supprimer le fichier
      return res.status(400).json({ error: 'Only image files are allowed' });
    }
    
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Excel import route
app.post('/api/import/excel', verifyUser, uploadExcel.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Vérifier si l'utilisateur a un abonnement premium
    const subscriptionQuery = `
      SELECT st.name as subscription_type
      FROM user_subscriptions us
      JOIN subscription_types st ON st.id = us.subscription_type_id
      WHERE us.user_id = $1 
      AND us.status = 'active'
      AND (us.end_date IS NULL OR us.end_date >= CURRENT_DATE)
      ORDER BY us.created_at DESC
      LIMIT 1
    `;
    
    const subscriptionResult = await pool.query(subscriptionQuery, [req.userId]);
    const isPremium = subscriptionResult.rows[0]?.subscription_type === 'premium';

    if (!isPremium) {
      return res.status(403).json({ 
        error: 'Cette fonctionnalité est réservée aux utilisateurs premium',
        redirectTo: '/subscription'
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // Supprimer le fichier temporaire
    fs.unlinkSync(req.file.path);

    // Insérer les cartes
    const insertedCards = [];
    for (const row of data) {
      const query = `
        INSERT INTO cards (
          name, price, status, category, user_id, collection_id,
          bought_date, sold_date, sold_price, image_url, description,
          graded, grading_company, grading_value
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const values = [
        row.name || 'Unknown',
        parseFloat(row.price) || 0,
        row.status || 'bought',
        row.category || 'Other',
        req.userId,
        1, // Collection par défaut
        row.bought_date || new Date().toISOString().split('T')[0],
        row.sold_date || null,
        row.sold_price ? parseFloat(row.sold_price) : null,
        row.image_url || '/default-card.jpg',
        row.description || null,
        row.graded || false,
        row.grading_company || null,
        row.grading_value ? parseFloat(row.grading_value) : null
      ];

      const result = await pool.query(query, values);
      insertedCards.push(result.rows[0]);
    }

    res.json({ 
      message: `${insertedCards.length} cards imported successfully`,
      cards: insertedCards
    });
  } catch (error) {
    console.error('Error importing Excel file:', error);
    res.status(500).json({ error: 'Failed to import Excel file' });
  }
});

// Subscription routes
app.get('/api/subscriptions/types', verifyUser, async (req, res) => {
  try {
    const query = 'SELECT * FROM subscription_types ORDER BY price ASC';
    const result = await pool.query(query);
    res.json(result.rows);
      } catch (error) {
    console.error('Error fetching subscription types:', error);
    res.status(500).json({ error: 'Failed to fetch subscription types' });
  }
});

app.get('/api/subscriptions/current', verifyUser, async (req, res) => {
  try {
    const query = `
      SELECT us.*, st.name as subscription_type, st.max_cards, st.price
      FROM user_subscriptions us
      JOIN subscription_types st ON st.id = us.subscription_type_id
      WHERE us.user_id = $1 
      AND us.status = 'active'
      AND (us.end_date IS NULL OR us.end_date >= CURRENT_DATE)
      ORDER BY us.created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [req.userId]);
    
    if (result.rows.length === 0) {
      // Return free tier info if no active subscription
      const freeTierQuery = 'SELECT * FROM subscription_types WHERE name = $1';
      const freeTier = await pool.query(freeTierQuery, ['Free']);
      res.json({
        subscription_type: freeTier.rows[0],
        is_free_tier: true
      });
    } else {
      res.json({
        subscription: result.rows[0],
        is_free_tier: false
      });
    }
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ error: 'Failed to fetch current subscription' });
  }
});

// Categories routes
app.get('/api/categories', async (req, res) => {
  try {
    const query = 'SELECT * FROM categories ORDER BY name';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 