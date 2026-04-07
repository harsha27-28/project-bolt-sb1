// Alternative weather service that works without Supabase Edge Functions
// This can be used if the Edge Function continues to fail

export interface SimpleWeatherData {
  location: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  weather_condition: string;
  risk_level: 'Low' | 'Medium' | 'High';
  risk_diseases: string[];
}

export function calculateSimpleRiskLevel(temperature: number, humidity: number, rainfall: number): {
  level: 'Low' | 'Medium' | 'High';
  diseases: string[];
} {
  const risks: string[] = [];
  let level: 'Low' | 'Medium' | 'High' = 'Low';

  // High humidity + moderate temperature = fungal diseases
  if (humidity > 80 && temperature >= 20 && temperature <= 30) {
    risks.push('Fungal diseases (Early Blight, Late Blight, Powdery Mildew)');
    level = 'High';
  } else if (humidity > 70 && temperature >= 18 && temperature <= 32) {
    risks.push('Fungal diseases');
    level = 'Medium';
  }

  // High rainfall = bacterial diseases
  if (rainfall > 50) {
    risks.push('Bacterial Spot');
    if (level === 'Low') level = 'Medium';
    else if (level === 'Medium') level = 'High';
  }

  // Hot and dry = pest activity
  if (temperature > 30 && humidity < 50) {
    risks.push('Yellow Vein Mosaic (whitefly activity increases)');
    if (level === 'Low') level = 'Medium';
  }

  return {
    level,
    diseases: risks.length > 0 ? risks : ['No specific risks detected'],
  };
}

export function generateWeatherForLocation(location: string): SimpleWeatherData {
  // Generate realistic weather based on location characteristics
  const locationLower = location.toLowerCase();
  
  // Base values
  let baseTemp = 25;
  let baseHumidity = 65;
  let baseRainfall = 5;
  
  // Location-based adjustments
  if (locationLower.includes('mountain') || locationLower.includes('hill')) {
    baseTemp -= 5;
    baseHumidity += 10;
  }
  
  if (locationLower.includes('coastal') || locationLower.includes('beach')) {
    baseHumidity += 15;
    baseRainfall += 10;
  }
  
  if (locationLower.includes('desert') || locationLower.includes('arid')) {
    baseTemp += 8;
    baseHumidity -= 20;
    baseRainfall -= 3;
  }
  
  if (locationLower.includes('tropical') || locationLower.includes('jungle')) {
    baseTemp += 3;
    baseHumidity += 20;
    baseRainfall += 15;
  }
  
  // Add realistic variation
  const temperature = baseTemp + (Math.random() - 0.5) * 10;
  const humidity = Math.max(20, Math.min(95, baseHumidity + (Math.random() - 0.5) * 20));
  const rainfall = Math.max(0, baseRainfall + (Math.random() - 0.5) * 15);
  
  // Weather conditions
  const conditions = ['Clear', 'Cloudy', 'Partly Cloudy', 'Rainy', 'Sunny', 'Overcast', 'Misty'];
  const weather_condition = conditions[Math.floor(Math.random() * conditions.length)];
  
  // Calculate risk
  const risk = calculateSimpleRiskLevel(temperature, humidity, rainfall);
  
  return {
    location,
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity * 10) / 10,
    rainfall: Math.round(rainfall * 10) / 10,
    weather_condition,
    risk_level: risk.level,
    risk_diseases: risk.diseases,
  };
}

// Simple weather service that always works
export async function getWeatherData(location: string): Promise<SimpleWeatherData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return generateWeatherForLocation(location);
}
