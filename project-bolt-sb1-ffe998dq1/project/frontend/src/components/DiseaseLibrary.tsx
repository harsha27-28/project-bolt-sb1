import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { getAllDiseases, DiseaseRecord } from '../lib/diseaseDetection';

export function DiseaseLibrary() {
  const [diseases, setDiseases] = useState<DiseaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<'all' | 'Tomato' | "Lady's Finger">('all');
  const [selectedDisease, setSelectedDisease] = useState<DiseaseRecord | null>(null);

  useEffect(() => {
    loadDiseases();
  }, []);

  const loadDiseases = async () => {
    try {
      const data = await getAllDiseases();
      setDiseases(data);
    } catch (error) {
      console.error('Failed to load diseases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDiseases = diseases.filter(disease => {
    const matchesSearch = disease.disease_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          disease.crop_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCrop = selectedCrop === 'all' || disease.crop_name === selectedCrop;
    return matchesSearch && matchesCrop;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Fungal':
        return 'bg-orange-100 text-orange-800';
      case 'Bacterial':
        return 'bg-red-100 text-red-800';
      case 'Viral':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Disease Library</h2>
        <p className="text-gray-600">Browse comprehensive information about crop diseases</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search diseases or crops..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCrop('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCrop === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Crops
          </button>
          <button
            onClick={() => setSelectedCrop('Tomato')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCrop === 'Tomato'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tomato
          </button>
          <button
            onClick={() => setSelectedCrop("Lady's Finger")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCrop === "Lady's Finger"
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Lady's Finger
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {filteredDiseases.map((disease) => (
            <button
              key={disease.id}
              onClick={() => setSelectedDisease(disease)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedDisease?.id === disease.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{disease.disease_name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(disease.disease_type)}`}>
                  {disease.disease_type}
                </span>
              </div>
              <p className="text-sm text-gray-600">{disease.crop_name}</p>
            </button>
          ))}
        </div>

        <div className="lg:sticky lg:top-6 h-fit">
          {selectedDisease ? (
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedDisease.disease_name}</h3>
                  <span className={`text-sm px-3 py-1 rounded-full ${getTypeColor(selectedDisease.disease_type)}`}>
                    {selectedDisease.disease_type}
                  </span>
                </div>
                <p className="text-gray-600">{selectedDisease.crop_name}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Symptoms</h4>
                <ul className="space-y-1 text-gray-700 text-sm">
                  {selectedDisease.symptoms.map((symptom, index) => (
                    <li key={index}>• {symptom}</li>
                  ))}
                </ul>
              </div>

              {selectedDisease.disease_name !== 'Healthy' && (
                <>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Prevention</h4>
                    <p className="text-gray-700 text-sm">{selectedDisease.prevention}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Organic Treatment</h4>
                    <p className="text-gray-700 text-sm">{selectedDisease.treatment_organic}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Chemical Treatment</h4>
                    <p className="text-gray-700 text-sm">{selectedDisease.treatment_chemical}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a disease to view detailed information</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
