-- Add missing tomato diseases to the database
-- Run this in your Supabase SQL editor to add the missing diseases

-- Add Leaf Mold
INSERT INTO diseases (crop_name, disease_name, disease_type, symptoms, prevention, treatment_organic, treatment_chemical, image_indicators)
SELECT 'Tomato', 'Leaf Mold', 'Fungal', 
  ARRAY['Yellow spots on upper leaf surfaces', 'Grayish-white mold on leaf undersides', 'Leaf curling and distortion', 'Premature leaf drop'],
  'Ensure good air circulation, avoid overhead watering, maintain proper plant spacing',
  'Remove infected leaves, apply neem oil spray, improve ventilation',
  'Use copper-based fungicides or chlorothalonil, apply preventively',
  ARRAY['Yellow spots on leaves', 'White mold underneath', 'Leaf curling']
WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE crop_name = 'Tomato' AND disease_name = 'Leaf Mold');

-- Add Septoria Leaf Spot
INSERT INTO diseases (crop_name, disease_name, disease_type, symptoms, prevention, treatment_organic, treatment_chemical, image_indicators)
SELECT 'Tomato', 'Septoria Leaf Spot', 'Fungal',
  ARRAY['Small dark spots with gray centers', 'Yellow halos around spots', 'Spots may merge to form larger lesions', 'Leaf yellowing and drop'],
  'Remove infected plant debris, avoid overhead watering, practice crop rotation',
  'Remove infected leaves, apply copper sprays, improve air circulation',
  'Use chlorothalonil or mancozeb fungicides, apply at first sign of disease',
  ARRAY['Small dark spots', 'Gray centers', 'Yellow halos']
WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE crop_name = 'Tomato' AND disease_name = 'Septoria Leaf Spot');

-- Add Spider Mites (classified as Fungal for database compatibility)
INSERT INTO diseases (crop_name, disease_name, disease_type, symptoms, prevention, treatment_organic, treatment_chemical, image_indicators)
SELECT 'Tomato', 'Spider Mites', 'Fungal',
  ARRAY['Fine webbing on leaves and stems', 'Yellow or bronze stippling on leaves', 'Leaf curling and distortion', 'Reduced plant vigor'],
  'Maintain adequate humidity, remove weeds, monitor regularly',
  'Spray with water to dislodge mites, apply neem oil, introduce beneficial insects',
  'Use miticides like abamectin or spiromesifen, apply when mites are first detected',
  ARRAY['Fine webbing', 'Stippled leaves', 'Bronze discoloration']
WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE crop_name = 'Tomato' AND disease_name = 'Spider Mites');

-- Add Target Spot
INSERT INTO diseases (crop_name, disease_name, disease_type, symptoms, prevention, treatment_organic, treatment_chemical, image_indicators)
SELECT 'Tomato', 'Target Spot', 'Fungal',
  ARRAY['Dark brown spots with concentric rings', 'Target-like appearance on leaves', 'Spots may appear on fruits', 'Leaf yellowing around spots'],
  'Remove infected plant debris, ensure good air circulation, avoid overhead watering',
  'Remove infected leaves, apply copper sprays, improve growing conditions',
  'Use chlorothalonil or azoxystrobin fungicides, apply preventively',
  ARRAY['Concentric rings', 'Target pattern', 'Brown lesions']
WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE crop_name = 'Tomato' AND disease_name = 'Target Spot');

-- Add Tomato Mosaic Virus
INSERT INTO diseases (crop_name, disease_name, disease_type, symptoms, prevention, treatment_organic, treatment_chemical, image_indicators)
SELECT 'Tomato', 'Tomato Mosaic Virus', 'Viral',
  ARRAY['Mottled yellow and green patterns on leaves', 'Leaf distortion and curling', 'Stunted plant growth', 'Reduced fruit quality'],
  'Use virus-free seeds, control aphid vectors, disinfect tools',
  'Remove infected plants immediately, control aphids with neem oil, use reflective mulches',
  'No direct cure for viruses, focus on vector control with insecticides',
  ARRAY['Mosaic patterns', 'Leaf distortion', 'Mottled appearance']
WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE crop_name = 'Tomato' AND disease_name = 'Tomato Mosaic Virus');

-- Add Tomato Yellow Leaf Curl Virus
INSERT INTO diseases (crop_name, disease_name, disease_type, symptoms, prevention, treatment_organic, treatment_chemical, image_indicators)
SELECT 'Tomato', 'Tomato Yellow Leaf Curl Virus', 'Viral',
  ARRAY['Upward curling of leaves', 'Yellowing of leaf margins', 'Stunted plant growth', 'Reduced fruit production'],
  'Use resistant varieties, control whitefly vectors, remove infected plants',
  'Remove infected plants, control whiteflies with neem oil, use yellow sticky traps',
  'Apply imidacloprid for whitefly control, no direct viral cure available',
  ARRAY['Upward curling', 'Yellow margins', 'Stunted growth']
WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE crop_name = 'Tomato' AND disease_name = 'Tomato Yellow Leaf Curl Virus');

-- Verify the additions
SELECT 'Added diseases:' as status;
SELECT disease_name, disease_type FROM diseases WHERE crop_name = 'Tomato' ORDER BY disease_name;
