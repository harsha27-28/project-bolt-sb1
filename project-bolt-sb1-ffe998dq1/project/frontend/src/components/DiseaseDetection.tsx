import { useState, useRef } from 'react';
import { Upload, Camera, Loader2, ArrowLeft, CheckCircle, AlertTriangle, Save } from 'lucide-react';
import { simulateAIDetection, DetectionResult } from '../lib/diseaseDetection';
import { createDiaryEntry } from '../lib/farmDiary';

interface DiseaseDetectionProps {
  cropName: 'Tomato' | "Lady's Finger";
  onBack: () => void;
}

export function DiseaseDetection({ cropName, onBack }: DiseaseDetectionProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setResult(null);
    setSaved(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDetect = async () => {
    if (!selectedImage) return;

    setDetecting(true);
    try {
      const detectionResult = await simulateAIDetection(selectedImage, cropName);
      setResult(detectionResult);
    } catch (error) {
      console.error('Detection error:', error);
      alert('Failed to detect disease. Please try again.');
    } finally {
      setDetecting(false);
    }
  };

  const handleSaveToDiary = async () => {
    if (!result) return;

    setSaving(true);
    try {
      await createDiaryEntry({
        crop_name: cropName,
        disease_name: result.disease_name,
        confidence: result.confidence,
        notes: '',
        treatment_applied: '',
      });
      setSaved(true);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save to diary. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getRiskColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-700 bg-green-50 border-green-200';
    if (confidence >= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Crop Selection</span>
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Disease Detection - {cropName}
        </h2>
        <p className="text-gray-600">Upload an image to detect diseases</p>
      </div>

      <div className="space-y-6">
        {!imagePreview ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-green-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="mb-4">
              <Camera className="w-16 h-16 mx-auto text-gray-400" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Crop Image
            </h3>
            <p className="text-gray-600 mb-6">
              Take a clear photo of affected leaves or fruits
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Choose Image
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img
                src={imagePreview}
                alt="Selected crop"
                className="w-full h-96 object-cover"
              />
            </div>

            {!result && (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setSelectedImage(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Choose Different Image
                </button>

                <button
                  onClick={handleDetect}
                  disabled={detecting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {detecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Detect Disease'
                  )}
                </button>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                <div className={`rounded-xl border-2 p-6 ${getRiskColor(result.confidence)}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{result.disease_name}</h3>
                      <p className="text-sm opacity-75">
                        {result.disease_info.disease_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{result.confidence}%</div>
                      <div className="text-sm opacity-75">Confidence</div>
                    </div>
                  </div>

                  {result.disease_name !== 'Healthy' && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Treatment recommended</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Symptoms</h4>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      {result.disease_info.symptoms.map((symptom, index) => (
                        <li key={index}>• {symptom}</li>
                      ))}
                    </ul>
                  </div>

                  {result.disease_name !== 'Healthy' && (
                    <>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Prevention</h4>
                        <p className="text-gray-700 text-sm">{result.disease_info.prevention}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Organic Treatment</h4>
                        <p className="text-gray-700 text-sm">{result.disease_info.treatment_organic}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Chemical Treatment</h4>
                        <p className="text-gray-700 text-sm">{result.disease_info.treatment_chemical}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedImage(null);
                      setResult(null);
                      setSaved(false);
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Analyze Another Image
                  </button>

                  <button
                    onClick={handleSaveToDiary}
                    disabled={saving || saved}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saved ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Saved to Diary
                      </>
                    ) : saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save to Farm Diary
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
