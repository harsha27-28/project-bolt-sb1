import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WeatherResponse {
  location: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  weather_condition: string;
  risk_level: 'Low' | 'Medium' | 'High';
  risk_diseases: string[];
}

type DenoLike = {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const deno = (globalThis as typeof globalThis & { Deno?: DenoLike }).Deno;

if (!deno) {
  throw new Error("Deno runtime is required for this function");
}

function calculateRiskLevel(temperature: number, humidity: number, rainfall: number): {
  level: 'Low' | 'Medium' | 'High';
  diseases: string[];
} {
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

  return {
    level,
    diseases: risks.length > 0 ? risks : ['No specific risks detected'],
  };
}

deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const location = url.searchParams.get('location');

    if (!location) {
      return new Response(
        JSON.stringify({ error: 'Location parameter is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const OPENWEATHER_API_KEY = deno.env.get('OPENWEATHER_API_KEY');

    if (!OPENWEATHER_API_KEY) {
      const mockData: WeatherResponse = {
        location,
        temperature: 25 + Math.random() * 10,
        humidity: 60 + Math.random() * 30,
        rainfall: Math.random() * 20,
        weather_condition: ['Clear', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
        risk_level: 'Low',
        risk_diseases: ['No specific risks detected'],
      };

      const risk = calculateRiskLevel(
        mockData.temperature,
        mockData.humidity,
        mockData.rainfall
      );

      mockData.risk_level = risk.level;
      mockData.risk_diseases = risk.diseases;

      return new Response(
        JSON.stringify(mockData),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data from OpenWeatherMap');
    }

    const weatherData = await weatherResponse.json();

    const temperature = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const rainfall = weatherData.rain ? (weatherData.rain['1h'] || 0) : 0;
    const weather_condition = weatherData.weather[0].main;

    const risk = calculateRiskLevel(temperature, humidity, rainfall);

    const response: WeatherResponse = {
      location: weatherData.name,
      temperature,
      humidity,
      rainfall,
      weather_condition,
      risk_level: risk.level,
      risk_diseases: risk.diseases,
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
