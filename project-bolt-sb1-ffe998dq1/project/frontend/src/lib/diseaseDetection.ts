import { apiRequest } from './api';

export interface DiseaseRecord {
  id: string;
  crop_name: 'Tomato' | "Lady's Finger";
  disease_name: string;
  disease_type: 'Fungal' | 'Bacterial' | 'Viral' | 'Healthy';
  symptoms: string[];
  prevention: string;
  treatment_organic: string;
  treatment_chemical: string;
  image_indicators: string[];
  created_at: string;
}

export interface DetectionResult {
  disease_name: string;
  confidence: number;
  crop_name: string;
  disease_info: {
    disease_type: string;
    symptoms: string[];
    prevention: string;
    treatment_organic: string;
    treatment_chemical: string;
  };
}

const DISEASE_PATTERNS = {
  Tomato: {
    'Early Blight': ['dark', 'brown', 'spot', 'ring', 'concentric', 'target', 'lesion'],
    'Late Blight': ['gray', 'green', 'water', 'soaked', 'white', 'fuzzy', 'mold'],
    'Bacterial Spot': ['small', 'dark', 'halo', 'yellow', 'raised'],
    Healthy: ['vibrant', 'green', 'uniform', 'clean', 'no spot'],
  },
  "Lady's Finger": {
    'Yellow Vein Mosaic': ['yellow', 'vein', 'mosaic', 'pattern', 'distortion'],
    'Powdery Mildew': ['white', 'powder', 'coating', 'dusty', 'mildew'],
    Healthy: ['dark', 'green', 'strong', 'clean', 'vigorous'],
  },
};

function getDiseaseTypeFromName(diseaseName: string): string {
  const name = diseaseName.toLowerCase();
  if (name.includes('bacterial')) return 'Bacterial';
  if (name.includes('mosaic') || name.includes('virus')) return 'Viral';
  if (name.includes('mold') || name.includes('blight') || name.includes('mildew') || name.includes('spot')) return 'Fungal';
  if (name.includes('mites')) return 'Fungal';
  return 'Fungal';
}

function getGenericSymptoms(diseaseName: string): string[] {
  const name = diseaseName.toLowerCase();

  if (name.includes('leaf mold')) {
    return [
      'Yellow spots on upper leaf surfaces',
      'Grayish-white mold on leaf undersides',
      'Leaf curling and distortion',
      'Premature leaf drop',
    ];
  }

  if (name.includes('septoria')) {
    return [
      'Small dark spots with gray centers',
      'Yellow halos around spots',
      'Spots may merge to form larger lesions',
      'Leaf yellowing and drop',
    ];
  }

  if (name.includes('spider mites')) {
    return [
      'Fine webbing on leaves and stems',
      'Yellow or bronze stippling on leaves',
      'Leaf curling and distortion',
      'Reduced plant vigor',
    ];
  }

  if (name.includes('target spot')) {
    return [
      'Dark brown spots with concentric rings',
      'Target-like appearance on leaves',
      'Spots may appear on fruits',
      'Leaf yellowing around spots',
    ];
  }

  if (name.includes('mosaic virus')) {
    return [
      'Mottled yellow and green patterns on leaves',
      'Leaf distortion and curling',
      'Stunted plant growth',
      'Reduced fruit quality',
    ];
  }

  if (name.includes('yellow leaf curl')) {
    return [
      'Upward curling of leaves',
      'Yellowing of leaf margins',
      'Stunted plant growth',
      'Reduced fruit production',
    ];
  }

  return [
    'Abnormal leaf discoloration',
    'Spots or lesions on leaves',
    'Reduced plant vigor',
    'Leaf distortion or curling',
  ];
}

function getGenericPrevention(diseaseName: string): string {
  const name = diseaseName.toLowerCase();

  if (name.includes('leaf mold')) {
    return 'Ensure good air circulation, avoid overhead watering, maintain proper plant spacing, remove infected plant debris';
  }
  if (name.includes('septoria')) {
    return 'Remove infected plant debris, avoid overhead watering, practice crop rotation, ensure good drainage';
  }
  if (name.includes('spider mites')) {
    return 'Maintain adequate humidity, remove weeds, monitor regularly, avoid over-fertilization';
  }
  if (name.includes('target spot')) {
    return 'Remove infected plant debris, ensure good air circulation, avoid overhead watering, practice crop rotation';
  }
  if (name.includes('mosaic virus')) {
    return 'Use virus-free seeds, control aphid vectors, disinfect tools, remove infected plants immediately';
  }
  if (name.includes('yellow leaf curl')) {
    return 'Use resistant varieties, control whitefly vectors, remove infected plants, use reflective mulches';
  }

  return 'Monitor crops regularly, maintain good cultural practices, ensure proper spacing and air circulation';
}

function getGenericOrganicTreatment(diseaseName: string): string {
  const name = diseaseName.toLowerCase();

  if (name.includes('leaf mold')) {
    return 'Remove infected leaves, apply neem oil spray weekly, improve ventilation, use copper-based organic fungicides';
  }
  if (name.includes('septoria')) {
    return 'Remove infected leaves, apply copper sprays, improve air circulation, use baking soda solution (1 tsp per quart)';
  }
  if (name.includes('spider mites')) {
    return 'Spray with water to dislodge mites, apply neem oil, introduce beneficial insects like ladybugs, use insecticidal soap';
  }
  if (name.includes('target spot')) {
    return 'Remove infected leaves, apply copper sprays, improve growing conditions, use sulfur-based organic fungicides';
  }
  if (name.includes('mosaic virus')) {
    return 'Remove infected plants immediately, control aphids with neem oil, use reflective mulches, no cure available';
  }
  if (name.includes('yellow leaf curl')) {
    return 'Remove infected plants, control whiteflies with neem oil, use yellow sticky traps, no cure available';
  }

  return 'Apply neem oil spray, remove infected plant parts, improve growing conditions, use organic fungicides';
}

function getGenericChemicalTreatment(diseaseName: string): string {
  const name = diseaseName.toLowerCase();

  if (name.includes('leaf mold')) {
    return 'Use copper-based fungicides or chlorothalonil, apply preventively every 7-10 days, follow label instructions';
  }
  if (name.includes('septoria')) {
    return 'Use chlorothalonil or mancozeb fungicides, apply at first sign of disease, repeat every 7-10 days';
  }
  if (name.includes('spider mites')) {
    return 'Use miticides like abamectin or spiromesifen, apply when mites are first detected, rotate products to prevent resistance';
  }
  if (name.includes('target spot')) {
    return 'Use chlorothalonil or azoxystrobin fungicides, apply preventively, follow label instructions carefully';
  }
  if (name.includes('mosaic virus')) {
    return 'No direct cure for viruses, focus on vector control with insecticides like imidacloprid for aphids';
  }
  if (name.includes('yellow leaf curl')) {
    return 'Apply imidacloprid for whitefly control, no direct viral cure available, focus on prevention';
  }

  return 'Consult with agricultural extension service for appropriate chemical treatments, follow all safety guidelines';
}

const ML_API_BASE_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

async function findDisease(cropName: string, diseaseName: string): Promise<DiseaseRecord | null> {
  const params = new URLSearchParams({
    cropName,
    diseaseName,
  });
  return apiRequest<DiseaseRecord | null, undefined>(`/api/diseases/find?${params.toString()}`);
}

export async function simulateAIDetection(
  imageFile: File,
  cropName: 'Tomato' | "Lady's Finger"
): Promise<DetectionResult> {
  try {
    return await detectWithMLModel(imageFile, cropName);
  } catch (error) {
    console.warn('ML model unavailable, using heuristic:', error);
    return await detectWithHeuristic(imageFile, cropName);
  }
}

async function detectWithMLModel(
  imageFile: File,
  cropName: 'Tomato' | "Lady's Finger"
): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await fetch(`${ML_API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ML API error: ${response.status}`);
  }

  const mlResult = await response.json() as {
    predicted_class: string;
    confidence: number;
  };

  const confidence = Math.round(mlResult.confidence * 100 * 10) / 10;
  const diseaseMapping: Record<string, string> = {
    Bacterial_spot: 'Bacterial Spot',
    Early_blight: 'Early Blight',
    Late_blight: 'Late Blight',
    Leaf_Mold: 'Leaf Mold',
    Septoria_leaf_spot: 'Septoria Leaf Spot',
    Spider_mites: 'Spider Mites',
    Target_Spot: 'Target Spot',
    Tomato_mosaic_virus: 'Tomato Mosaic Virus',
    Tomato_YellowLeaf_Curl_Virus: 'Tomato Yellow Leaf Curl Virus',
    Healthy: 'Healthy',
  };

  const mappedDisease = diseaseMapping[mlResult.predicted_class] || mlResult.predicted_class;
  console.log(`Looking for disease: "${mappedDisease}" in crop: "${cropName}"`);

  const allTomatoDiseases = await getAllDiseases('Tomato');
  console.log('All tomato diseases in database:', allTomatoDiseases.map((disease) => disease.disease_name));

  const diseaseInfo = await findDisease(cropName, mappedDisease);
  if (!diseaseInfo) {
    console.warn(`Disease "${mappedDisease}" not found in database, using generic info`);
    return {
      disease_name: mappedDisease,
      confidence,
      crop_name: cropName,
      disease_info: {
        disease_type: getDiseaseTypeFromName(mappedDisease),
        symptoms: getGenericSymptoms(mappedDisease),
        prevention: getGenericPrevention(mappedDisease),
        treatment_organic: getGenericOrganicTreatment(mappedDisease),
        treatment_chemical: getGenericChemicalTreatment(mappedDisease),
      },
    };
  }

  return {
    disease_name: diseaseInfo.disease_name,
    confidence,
    crop_name: cropName,
    disease_info: {
      disease_type: diseaseInfo.disease_type,
      symptoms: diseaseInfo.symptoms,
      prevention: diseaseInfo.prevention,
      treatment_organic: diseaseInfo.treatment_organic,
      treatment_chemical: diseaseInfo.treatment_chemical,
    },
  };
}

async function detectWithHeuristic(
  imageFile: File,
  cropName: 'Tomato' | "Lady's Finger"
): Promise<DetectionResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  async function estimateHealthScore(file: File): Promise<number> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(0.5);
            return;
          }

          const targetSize = 96;
          const scale = Math.max(img.width, img.height) > 0 ? targetSize / Math.max(img.width, img.height) : 1;
          canvas.width = Math.max(1, Math.floor(img.width * scale));
          canvas.height = Math.max(1, Math.floor(img.height * scale));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let greenDominantCount = 0;
          let redOrangeDominantCount = 0;
          let darkBrownishCount = 0;
          let totalCount = 0;

          const step = 16;
          for (let i = 0; i < imageData.length; i += step) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const brightness = (r + g + b) / 3;

            const isGreenish = g > r + 10 && g > b + 10 && g > 60;
            const isRedOrange =
              ((r > 120 && r > g + 15 && b < 110) || (r > 150 && g > 90 && b < 120 && r - b > 40)) &&
              brightness > 85;
            const isDark = brightness < 55;
            const isBrownish = r > g - 10 && r > b + 15 && g > b && brightness < 140;

            if (isGreenish) greenDominantCount += 1;
            if (isRedOrange) redOrangeDominantCount += 1;
            if (isDark || isBrownish) darkBrownishCount += 1;
            totalCount += 1;
          }

          if (totalCount === 0) {
            resolve(0.5);
            return;
          }

          const greenRatio = greenDominantCount / totalCount;
          const redOrangeRatio = redOrangeDominantCount / totalCount;
          const darkBrownRatio = darkBrownishCount / totalCount;

          const healthyColor = Math.max(
            greenRatio * 0.9,
            cropName === 'Tomato' ? redOrangeRatio * 1.0 : redOrangeRatio * 0.5
          );
          const score = Math.min(1, Math.max(0, healthyColor * 0.85 + (1 - darkBrownRatio) * 0.15));
          resolve(score);
        } catch {
          resolve(0.5);
        }
      };
      img.onerror = () => resolve(0.5);
      img.crossOrigin = 'anonymous';
      img.src = URL.createObjectURL(file);
    });
  }

  const healthScore = await estimateHealthScore(imageFile);
  const diseases = DISEASE_PATTERNS[cropName];
  const diseaseNames = Object.keys(diseases);

  const strongHealthy = healthScore >= 0.65;
  const slightHealthy = healthScore >= 0.58;
  const randomDiseaseIndex = Math.floor(Math.random() * (diseaseNames.length - 1));
  const randomDisease = diseaseNames[randomDiseaseIndex];

  const detectedDisease = strongHealthy
    ? 'Healthy'
    : slightHealthy && Math.random() > 0.4
      ? 'Healthy'
      : randomDisease;

  const baseConfidence = detectedDisease === 'Healthy'
    ? 78 + Math.round((healthScore - 0.5) * 40)
    : 70 + Math.floor(Math.random() * 20);
  const confidence = Math.min(95, Math.max(60, baseConfidence));

  const diseaseInfo = await findDisease(cropName, detectedDisease);
  if (!diseaseInfo) {
    throw new Error('Disease information not found');
  }

  return {
    disease_name: detectedDisease,
    confidence: Math.round(confidence * 10) / 10,
    crop_name: cropName,
    disease_info: {
      disease_type: diseaseInfo.disease_type,
      symptoms: diseaseInfo.symptoms,
      prevention: diseaseInfo.prevention,
      treatment_organic: diseaseInfo.treatment_organic,
      treatment_chemical: diseaseInfo.treatment_chemical,
    },
  };
}

export async function uploadImage(file: File, userId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(`Could not encode image for user ${userId}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export async function getAllDiseases(cropName?: string) {
  const params = new URLSearchParams();
  if (cropName) {
    params.set('cropName', cropName);
  }
  const query = params.toString();
  return apiRequest<DiseaseRecord[], undefined>(query ? `/api/diseases?${query}` : '/api/diseases');
}

export async function getDiseaseInfo(cropName: string, diseaseName: string) {
  return findDisease(cropName, diseaseName);
}
