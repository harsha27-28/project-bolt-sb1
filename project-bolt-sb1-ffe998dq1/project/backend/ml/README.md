# Tomato Disease Detection ML Pipeline

This directory contains the machine learning pipeline for detecting diseases in tomato leaves using the PlantVillage dataset.

## Dataset Structure

Your PlantVillage dataset should be organized as follows:

```
PlantVillage/
└── PlantVillage/
    ├── Tomato_Bacterial_spot/
    ├── Tomato_Early_blight/
    ├── Tomato_Late_blight/
    ├── Tomato_Leaf_Mold/
    ├── Tomato_Septoria_leaf_spot/
    ├── Tomato_Spider_mites_Two_spotted_spider_mite/
    ├── Tomato__Target_Spot/
    ├── Tomato__Tomato_mosaic_virus/
    ├── Tomato__Tomato_YellowLeaf__Curl_Virus/
    └── Tomato_healthy/
```

After running the organization script, it will be structured as:

```
data/
├── train/
│   ├── Bacterial_spot/
│   ├── Early_blight/
│   ├── Late_blight/
│   ├── Leaf_Mold/
│   ├── Septoria_leaf_spot/
│   ├── Spider_mites/
│   ├── Target_Spot/
│   ├── Tomato_mosaic_virus/
│   ├── Tomato_YellowLeaf_Curl_Virus/
│   └── Healthy/
├── validation/
│   └── [same structure]
└── test/
    └── [same structure]
```

## Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Organize your dataset:**
```bash
# Run the organization script to create train/validation/test splits
python organize_dataset.py
```

3. **Train the model:**
```bash
python train_model.py
```

4. **Start the inference API:**
```bash
python inference_api.py
```

## Training

### Option 1: Use the Training Script
```bash
python train_model.py
```

### Option 2: Use Jupyter Notebook
```bash
# Open the notebook
jupyter notebook tomato_disease_detection.ipynb

# Run all cells to train the model
```

This will:
- Load and preprocess the PlantVillage dataset
- Create train/validation/test splits (70%/15%/15%)
- Train InceptionV3 and MobileNetV2 models with transfer learning
- Fine-tune the models for better performance
- Save the trained models and class mappings
- Generate evaluation metrics and visualizations

## Inference API

Start the inference server:

```bash
python inference_api.py
```

The API will be available at `http://localhost:8000`

### API Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /predict` - Upload image for disease prediction
- `GET /classes` - List all disease classes
- `GET /class/{class_name}` - Get info about specific class

### Example Usage

```bash
# Test prediction
curl -X POST "http://localhost:8000/predict" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@path/to/your/image.jpg"
```

## Integration with Frontend

The trained model can be integrated with the React frontend by:

1. Running the inference API server
2. Updating the `simulateAIDetection` function in `diseaseDetection.ts` to call the API
3. Mapping ML model outputs to the existing disease database schema

## Model Performance

The model achieves:
- Multi-class classification for tomato diseases
- Binary classification for lady's finger (healthy vs diseased)
- Transfer learning with MobileNetV2 backbone
- Data augmentation for better generalization
- Early stopping and learning rate reduction

## Files

- `train_model.py` - Complete training pipeline
- `inference_api.py` - FastAPI server for model inference
- `requirements.txt` - Python dependencies
- `README.md` - This file

## Next Steps

1. Collect more lady's finger disease data
2. Implement real-time inference in the React app
3. Add confidence thresholds for better user experience
4. Deploy the API to a cloud service for production use
