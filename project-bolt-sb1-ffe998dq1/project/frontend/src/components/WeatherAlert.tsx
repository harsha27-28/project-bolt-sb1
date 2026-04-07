import { useState } from 'react';
import { Cloud, AlertTriangle, Info, X, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { fetchWeatherData, cacheWeatherData, WeatherData } from '../lib/weather';

export function WeatherAlert() {
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const closeSearchInput = () => {
    setShowInput(false);
    setError('');
    setLocation('');
  };

  const dismissWeatherAlert = () => {
    setDismissed(true);
    setShowInput(false);
    setError('');
    setLocation('');
    setWeather(null);
  };

  const handleFetchWeather = async () => {
    const trimmedLocation = location.trim();
    if (!trimmedLocation || !user) return;

    setLoading(true);
    setError('');

    try {
      const data = await fetchWeatherData(trimmedLocation);
      setWeather(data);
      setLocation(trimmedLocation);
      setDismissed(false);
      setShowInput(false);

      try {
        await cacheWeatherData(user.id, data);
      } catch (cacheError) {
        console.warn('Failed to cache weather data:', cacheError);
      }
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        setError(fetchError.message);
      } else {
        setError('Failed to fetch weather data');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderLocationInput = (className: string) => (
    <div className={className}>
      <h3 className="font-semibold text-gray-900 mb-4">Enter Your Location</h3>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleFetchWeather()}
            placeholder="Enter city name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => void handleFetchWeather()}
          disabled={loading || !location.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Check'}
        </button>
        <button
          onClick={closeSearchInput}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );

  if (dismissed || !weather) {
    return (
      <div className="mb-6">
        <button
          onClick={() => {
            setDismissed(false);
            setError('');
            setLocation('');
            setShowInput(true);
          }}
          className="w-full flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
        >
          <Cloud className="w-5 h-5 text-blue-600" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">Check Weather and Disease Risk</span>
        </button>

        {showInput && renderLocationInput('mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6')}
      </div>
    );
  }

  const getRiskIcon = () => {
    switch (weather.risk_level) {
      case 'High':
        return <AlertTriangle className="w-6 h-6" />;
      case 'Medium':
        return <Info className="w-6 h-6" />;
      default:
        return <Cloud className="w-6 h-6" />;
    }
  };

  const getRiskColor = () => {
    switch (weather.risk_level) {
      case 'High':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'Medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  return (
    <div className={`mb-6 rounded-xl border-2 p-6 ${getRiskColor()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {getRiskIcon()}
          <div>
            <h3 className="font-bold text-lg mb-1">
              {weather.risk_level} Risk - Weather Alert
            </h3>
            <p className="text-sm opacity-90 mb-2">
              {weather.location} | {weather.temperature.toFixed(1)} C | {weather.humidity.toFixed(0)}% humidity
            </p>
          </div>
        </div>
        <button
          onClick={dismissWeatherAlert}
          className="text-current opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <button
          onClick={() => {
            setDismissed(false);
            setShowInput(true);
          }}
          className="text-sm font-medium underline decoration-current underline-offset-2 hover:opacity-80"
        >
          Change Location
        </button>
      </div>

      {showInput && renderLocationInput('mb-4 bg-white dark:bg-gray-800 border border-current/20 rounded-xl p-4')}

      <div className="space-y-2">
        <p className="font-medium">At-Risk Diseases:</p>
        <ul className="space-y-1 text-sm">
          {weather.risk_diseases.map((disease, index) => (
            <li key={index}>- {disease}</li>
          ))}
        </ul>

        {weather.risk_level !== 'Low' && (
          <p className="text-sm mt-3 font-medium">
            Monitor your crops closely and consider preventive measures.
          </p>
        )}
      </div>
    </div>
  );
}
