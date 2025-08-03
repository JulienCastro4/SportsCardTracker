-- Suppression des tables existantes si elles existent
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_types CASCADE;

-- Création de la table des collections
CREATE TABLE collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Création de la table des cartes
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    sold_price DECIMAL(10,2),
    image_url TEXT,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    collection_id INTEGER REFERENCES collections(id),
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    bought_date DATE,
    sold_date DATE,
    graded BOOLEAN DEFAULT FALSE,
    grading_company VARCHAR(50),
    grading_value DECIMAL(3,1)
);

-- Création de la table des catégories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Création de la table des types d'abonnement
CREATE TABLE subscription_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    max_cards INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Création de la table des abonnements utilisateurs
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subscription_type_id INTEGER REFERENCES subscription_types(id),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Création des index pour améliorer les performances
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_cards_collection_id ON cards(collection_id);
CREATE INDEX idx_cards_category ON cards(category);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- Création de la Main Collection par défaut
INSERT INTO collections (id, name, description, user_id)
VALUES (1, 'Main Collection', 'Default collection for all users', 'system')
ON CONFLICT (id) DO NOTHING;

-- Insertion des catégories par défaut
INSERT INTO categories (name) VALUES
    ('Baseball'),
    ('Basketball'),
    ('Football'),
    ('Hockey'),
    ('Soccer'),
    ('UFC'),
    ('F1'),
    ('Golf'),
    ('Tennis'),
    ('Pokemon'),
    ('Magic'),
    ('Yu-Gi-Oh'),
    ('Other')
ON CONFLICT (name) DO NOTHING;

-- Insertion des types d'abonnement par défaut
INSERT INTO subscription_types (id, name, max_cards, price) VALUES
    (1, 'Free', 10, 0),
    (2, 'Premium', -1, 9.99)
ON CONFLICT (id) DO NOTHING;

-- Création d'un trigger pour s'assurer que chaque utilisateur a accès à la Main Collection
CREATE OR REPLACE FUNCTION ensure_main_collection_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier si l'utilisateur a déjà accès à la Main Collection
    IF NOT EXISTS (
        SELECT 1 FROM collections 
        WHERE user_id = NEW.user_id AND id = 1
    ) THEN
        -- Créer un lien vers la Main Collection pour l'utilisateur
        INSERT INTO collections (id, name, description, user_id)
        VALUES (1, 'Main Collection', 'Default collection for all users', NEW.user_id)
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table des cartes
DROP TRIGGER IF EXISTS ensure_main_collection_access_trigger ON cards;
CREATE TRIGGER ensure_main_collection_access_trigger
    AFTER INSERT ON cards
    FOR EACH ROW
    EXECUTE FUNCTION ensure_main_collection_access();

-- Création d'une fonction pour nettoyer les collections vides
CREATE OR REPLACE FUNCTION cleanup_empty_collections()
RETURNS TRIGGER AS $$
BEGIN
    -- Supprimer la collection si elle est vide (sauf la Main Collection)
    IF OLD.collection_id != 1 AND NOT EXISTS (
        SELECT 1 FROM cards WHERE collection_id = OLD.collection_id
    ) THEN
        DELETE FROM collections WHERE id = OLD.collection_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour nettoyer les collections vides
DROP TRIGGER IF EXISTS cleanup_empty_collections_trigger ON cards;
CREATE TRIGGER cleanup_empty_collections_trigger
    AFTER DELETE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_empty_collections(); 