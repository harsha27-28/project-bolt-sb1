import { apiRequest } from './api';

export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  weather_condition: string;
  risk_level: 'Low' | 'Medium' | 'High';
  risk_diseases: string[];
}

interface LiveWeatherResponse {
  location: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  weather_condition: string;
}

export interface RiskAlert {
  level: 'Low' | 'Medium' | 'High';
  diseases: string[];
  message: string;
}

export function calculateRiskLevel(temperature: number, humidity: number, rainfall: number): RiskAlert {
  const risks: string[] = [];
  let level: 'Low' | 'Medium' | 'High' = 'Low';

  if (humidity > 80 && temperature >= 20 && temperature <= 30) {
    risks.push('Fungal diseases (Early Blight, Late Blight, Powdery Mildew)');
    level = 'High';
  } else if (humidity > 70 && temperature >= 18 && temperature <= 32) {
    risks.push('Fungal diseases');
    level = 'Medium';
  }

  if (rainfall > 50) {
    risks.push('Bacterial Spot');
    if (level === 'Low') level = 'Medium';
    else if (level === 'Medium') level = 'High';
  }

  if (temperature > 30 && humidity < 50) {
    risks.push('Yellow Vein Mosaic (whitefly activity increases)');
    if (level === 'Low') level = 'Medium';
  }

  let message = '';
  if (level === 'High') {
    message = 'High risk conditions detected. Monitor crops closely and consider preventive measures.';
  } else if (level === 'Medium') {
    message = 'Moderate risk conditions. Keep an eye on your crops for early signs of disease.';
  } else {
    message = 'Favorable conditions. Continue regular crop monitoring.';
  }

  return {
    level,
    diseases: risks.length > 0 ? risks : ['No specific risks detected'],
    message,
  };
}

export async function fetchWeatherData(location: string): Promise<WeatherData> {
  const params = new URLSearchParams({ location: location.trim() });
  const live = await apiRequest<LiveWeatherResponse, undefined>(`/api/weather/live?${params.toString()}`);
  const risk = calculateRiskLevel(live.temperature, live.humidity, live.rainfall);

  return {
    ...live,
    risk_level: risk.level,
    risk_diseases: risk.diseases,
  };
}

interface CachedWeatherData extends WeatherData {
  fetched_at: string;
}

export async function getCachedWeather(userId: string) {
  void userId;
  return apiRequest<CachedWeatherData | null, undefined>('/api/weather/cache/latest');
}

export async function cacheWeatherData(userId: string, weatherData: WeatherData) {
  void userId;
  return apiRequest<CachedWeatherData, WeatherData>('/api/weather/cache', {
    method: 'POST',
    body: weatherData,
  });
}
