import { Leaf } from 'lucide-react';

interface CropSelectionProps {
  onSelect: (crop: 'Tomato' | "Lady's Finger") => void;
}

export function CropSelection({ onSelect }: CropSelectionProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Crop</h2>
        <p className="text-gray-600">Choose the crop you want to analyze for disease detection</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect('Tomato')}
          className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 hover:border-green-500 transition-all duration-300 hover:shadow-xl"
        >
          <div className="p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
              🍅
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Tomato</h3>
            <p className="text-gray-600 mb-4">
              Detect Early Blight, Late Blight, and Bacterial Spot
            </p>
            <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
              <Leaf className="w-5 h-5" />
              <span>Select Tomato</span>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect("Lady's Finger")}
          className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 hover:border-green-500 transition-all duration-300 hover:shadow-xl"
        >
          <div className="p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
              🫛
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Lady's Finger (Okra)</h3>
            <p className="text-gray-600 mb-4">
              Detect Yellow Vein Mosaic and Powdery Mildew
            </p>
            <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
              <Leaf className="w-5 h-5" />
              <span>Select Okra</span>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">How it works</h4>
        <ol className="space-y-2 text-blue-800 text-sm">
          <li>1. Select your crop type above</li>
          <li>2. Upload or capture an image of affected leaves or fruits</li>
          <li>3. Get instant AI-powered disease detection results</li>
          <li>4. View treatment recommendations and save to your farm diary</li>
        </ol>
      </div>
    </div>
  );
}
