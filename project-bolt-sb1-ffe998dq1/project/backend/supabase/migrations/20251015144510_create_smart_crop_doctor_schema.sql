/*
  # Smart Crop Doctor Database Schema

  ## Overview
  Creates the complete database structure for the Smart Crop Doctor application including:
  - Disease information database
  - Farm diary for tracking observations
  - Weather cache for offline access
  - User profiles

  ## New Tables

  ### `diseases`
  Stores comprehensive disease information for tomato and okra crops
  - `id` (uuid, primary key)
  - `crop_name` (text) - "Tomato" or "Lady's Finger"
  - `disease_name` (text) - Name of the disease
  - `disease_type` (text) - "Fungal", "Bacterial", or "Viral"
  - `symptoms` (text[]) - Array of symptom descriptions
  - `prevention` (text) - Prevention advice
  - `treatment_organic` (text) - Organic treatment options
  - `treatment_chemical` (text) - Chemical treatment options
  - `image_indicators` (text[]) - Visual indicators for AI detection
  - `created_at` (timestamptz)

  ### `farm_diary`
  User's personal log of crop observations and treatments
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `crop_name` (text)
  - `disease_name` (text)
  - `confidence` (numeric) - AI detection confidence percentage
  - `image_url` (text) - Uploaded image URL
  - `notes` (text) - User observations
  - `treatment_applied` (text) - Treatment actions taken
  - `observation_date` (date)
  - `created_at` (timestamptz)

  ### `weather_cache`
  Cached weather data for offline access and historical tracking
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `location` (text) - City or coordinates
  - `temperature` (numeric)
  - `humidity` (numeric)
  - `rainfall` (numeric)
  - `weather_condition` (text)
  - `risk_level` (text) - "Low", "Medium", "High"
  - `risk_diseases` (text[]) - Array of at-risk diseases
  - `fetched_at` (timestamptz)

  ### `user_profiles`
  Extended user information
  - `id` (uuid, primary key, foreign key to auth.users)
  - `full_name` (text)
  - `location` (text) - Default location for weather
  - `primary_crop` (text) - User's main crop
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own diary entries and weather cache
  - Disease information is publicly readable
  - User profiles are private to the owner
*/

-- Create diseases table (public reference data)
CREATE TABLE IF NOT EXISTS diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name text NOT NULL CHECK (crop_name IN ('Tomato', 'Lady''s Finger')),
  disease_name text NOT NULL,
  disease_type text NOT NULL CHECK (disease_type IN ('Fungal', 'Bacterial', 'Viral', 'Healthy')),
  symptoms text[] DEFAULT '{}',
  prevention text DEFAULT '',
  treatment_organic text DEFAULT '',
  treatment_chemical text DEFAULT '',
  image_indicators text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create farm_diary table
CREATE TABLE IF NOT EXISTS farm_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  crop_name text NOT NULL,
  disease_name text NOT NULL,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 100),
  image_url text,
  notes text DEFAULT '',
  treatment_applied text DEFAULT '',
  observation_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create weather_cache table
CREATE TABLE IF NOT EXISTS weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location text NOT NULL,
  temperature numeric,
  humidity numeric,
  rainfall numeric DEFAULT 0,
  weather_condition text,
  risk_level text CHECK (risk_level IN ('Low', 'Medium', 'High')),
  risk_diseases text[] DEFAULT '{}',
  fetched_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  location text DEFAULT '',
  primary_crop text CHECK (primary_crop IN ('Tomato', 'Lady''s Finger', '') OR primary_crop IS NULL),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diseases (public read access)
CREATE POLICY "Anyone can view diseases"
  ON diseases FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for farm_diary
CREATE POLICY "Users can view own diary entries"
  ON farm_diary FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diary entries"
  ON farm_diary FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diary entries"
  ON farm_diary FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diary entries"
  ON farm_diary FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for weather_cache
CREATE POLICY "Users can view own weather cache"
  ON weather_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weather cache"
  ON weather_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weather cache"
  ON weather_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weather cache"
  ON weather_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_farm_diary_user_id ON farm_diary(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_diary_observation_date ON farm_diary(observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_weather_cache_user_id ON weather_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_cache_fetched_at ON weather_cache(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_diseases_crop_name ON diseases(crop_name);

-- Insert sample disease data
INSERT INTO diseases (crop_name, disease_name, disease_type, symptoms, prevention, treatment_organic, treatment_chemical, image_indicators) VALUES
  ('Tomato', 'Early Blight', 'Fungal', 
    ARRAY['Dark brown spots with concentric rings on older leaves', 'Yellowing around spots', 'Leaf drop in severe cases'],
    'Remove infected leaves, ensure good air circulation, avoid overhead watering, crop rotation',
    'Apply neem oil spray weekly, use copper-based fungicides, remove plant debris',
    'Use chlorothalonil or mancozeb fungicides, apply at first sign of disease',
    ARRAY['Concentric ring patterns', 'Brown lesions on leaves', 'Target-like spots']),
  
  ('Tomato', 'Late Blight', 'Fungal',
    ARRAY['Water-soaked gray-green spots on leaves', 'White fuzzy growth on leaf undersides', 'Brown lesions on stems and fruits'],
    'Plant resistant varieties, avoid overhead irrigation, ensure proper spacing',
    'Remove and destroy infected plants immediately, apply copper sprays preventively',
    'Use fungicides containing chlorothalonil or copper, apply before symptoms appear',
    ARRAY['Gray-green lesions', 'White mold on undersides', 'Rapid spreading']),
  
  ('Tomato', 'Bacterial Spot', 'Bacterial',
    ARRAY['Small dark brown spots on leaves with yellow halos', 'Raised spots on fruits', 'Leaf yellowing and drop'],
    'Use disease-free seeds, avoid working with wet plants, practice crop rotation',
    'Apply copper-based sprays, remove infected leaves, improve air circulation',
    'Use copper hydroxide or copper sulfate sprays, streptomycin in severe cases',
    ARRAY['Small dark spots with halos', 'Raised fruit lesions', 'Yellow borders']),
  
  ('Tomato', 'Healthy', 'Healthy',
    ARRAY['Vibrant green leaves', 'No spots or discoloration', 'Uniform growth'],
    'Maintain good cultural practices, monitor regularly, ensure proper nutrition',
    'Continue regular care, balanced fertilization, proper watering',
    'Not applicable',
    ARRAY['Uniform green color', 'No lesions', 'Healthy appearance']),
  
  ('Lady''s Finger', 'Yellow Vein Mosaic', 'Viral',
    ARRAY['Yellow veins on leaves forming mosaic pattern', 'Stunted plant growth', 'Reduced fruit production and quality'],
    'Control whitefly vectors, use resistant varieties, remove infected plants',
    'Remove infected plants, control whiteflies with neem oil, use reflective mulches',
    'Apply imidacloprid for whitefly control, no direct viral cure available',
    ARRAY['Yellow vein patterns', 'Mosaic appearance', 'Leaf distortion']),
  
  ('Lady''s Finger', 'Powdery Mildew', 'Fungal',
    ARRAY['White powdery coating on leaves and stems', 'Leaf curling and distortion', 'Premature leaf drop'],
    'Ensure good air circulation, avoid overhead watering, remove infected plant parts',
    'Spray with milk solution (1:9 with water), apply neem oil, use sulfur dust',
    'Apply sulfur-based fungicides or potassium bicarbonate sprays',
    ARRAY['White powdery coating', 'Leaf surface coverage', 'Dusty appearance']),
  
  ('Lady''s Finger', 'Healthy', 'Healthy',
    ARRAY['Dark green leaves', 'Strong upright growth', 'No disease symptoms'],
    'Maintain proper spacing, regular monitoring, balanced fertilization',
    'Continue good agricultural practices, organic compost application',
    'Not applicable',
    ARRAY['Dark green color', 'Clean leaves', 'Vigorous growth']);
