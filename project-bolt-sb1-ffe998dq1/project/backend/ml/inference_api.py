#!/usr/bin/env python3
"""
Inference API for Tomato and Lady's Finger Disease Detection
FastAPI server that serves the trained ML model
"""

import os
import io
import json
import numpy as np
import tensorflow as tf
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration - Updated for fast training
MODEL_PATH = "models/fast_model_final.h5"  # Updated to use fast model
CLASS_MAPPINGS_PATH = "models/class_mappings.json"
IMG_SIZE = (224, 224)

# Fallback model paths (try different models in order)
MODEL_PATHS = [
    "models/fast_model_final.h5",    # Fast training model
    "models/mini_model.h5",          # Mini training model
    "models/final_model.h5",         # Full training model
    "models/best_model.h5"           # Best model from training
]

# Tomato disease classes (matching your dataset)
TOMATO_CLASSES = [
    'Bacterial_spot',
    'Early_blight', 
    'Late_blight',
    'Leaf_Mold',
    'Septoria_leaf_spot',
    'Spider_mites',
    'Target_Spot',
    'Tomato_mosaic_virus',
    'Tomato_YellowLeaf_Curl_Virus',
    'Healthy'
]

# Initialize FastAPI app
app = FastAPI(title="Crop Disease Detection API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and class mappings
model = None
class_to_idx = None
idx_to_class = None

def load_model():
    """Load the trained model and class mappings with fallback"""
    global model, class_to_idx, idx_to_class
    
    model_loaded = False
    
    # Try to load model from different paths
    for model_path in MODEL_PATHS:
        try:
            if os.path.exists(model_path):
                logger.info(f"Attempting to load model from {model_path}")
                model = tf.keras.models.load_model(model_path)
                logger.info(f"✅ Model loaded successfully from {model_path}")
                model_loaded = True
                break
            else:
                logger.warning(f"Model not found at {model_path}")
        except Exception as e:
            logger.warning(f"Failed to load model from {model_path}: {str(e)}")
            continue
    
    if not model_loaded:
        raise FileNotFoundError(f"No valid model found. Tried: {MODEL_PATHS}")
    
    # Load class mappings
    try:
        if not os.path.exists(CLASS_MAPPINGS_PATH):
            raise FileNotFoundError(f"Class mappings not found at {CLASS_MAPPINGS_PATH}")
        
        with open(CLASS_MAPPINGS_PATH, 'r') as f:
            mappings = json.load(f)
            class_to_idx = mappings['class_to_idx']
            idx_to_class = {int(k): v for k, v in mappings['idx_to_class'].items()}
        
        logger.info(f"Class mappings loaded: {len(class_to_idx)} classes")
        
    except Exception as e:
        logger.error(f"Error loading class mappings: {str(e)}")
        # Create default mappings if file not found
        class_to_idx = {name: idx for idx, name in enumerate(TOMATO_CLASSES)}
        idx_to_class = {idx: name for idx, name in enumerate(TOMATO_CLASSES)}
        logger.warning("Using default class mappings")

def preprocess_image(image_bytes):
    """Preprocess uploaded image for model inference"""
    try:
        # Load image from bytes
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary (handles RGBA, L, P modes)
        if image.mode != 'RGB':
            if image.mode == 'RGBA':
                # Create white background for RGBA images
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1])  # Use alpha channel as mask
                image = background
            else:
                image = image.convert('RGB')
        
        # Resize to model input size
        image = image.resize(IMG_SIZE, Image.Resampling.LANCZOS)
        
        # Convert to numpy array and normalize
        image_array = np.array(image, dtype=np.float32) / 255.0
        
        # Validate image array
        if image_array.shape != (*IMG_SIZE, 3):
            raise ValueError(f"Invalid image shape: {image_array.shape}")
        
        # Add batch dimension
        image_array = np.expand_dims(image_array, axis=0)
        
        return image_array
        
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

def predict_disease(image_array):
    """Make prediction using the loaded model"""
    try:
        # Get prediction probabilities
        predictions = model.predict(image_array, verbose=0)
        
        # Get predicted class
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        
        # Get class name
        predicted_class = idx_to_class[predicted_class_idx]
        
        # Get top 3 predictions
        top_3_indices = np.argsort(predictions[0])[-3:][::-1]
        top_3_predictions = [
            {
                "class": idx_to_class[idx],
                "confidence": float(predictions[0][idx])
            }
            for idx in top_3_indices
        ]
        
        return {
            "predicted_class": predicted_class,
            "confidence": confidence,
            "top_predictions": top_3_predictions
        }
        
    except Exception as e:
        logger.error(f"Error making prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    try:
        load_model()
        logger.info("API startup completed successfully")
    except Exception as e:
        logger.error(f"Failed to start API: {str(e)}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Tomato Disease Detection API",
        "status": "running",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
        "classes": list(class_to_idx.keys()) if class_to_idx else [],
        "available_models": [path for path in MODEL_PATHS if os.path.exists(path)]
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    available_models = [path for path in MODEL_PATHS if os.path.exists(path)]
    current_model = None
    
    if model is not None:
        # Try to determine which model is currently loaded
        for path in MODEL_PATHS:
            if os.path.exists(path):
                try:
                    test_model = tf.keras.models.load_model(path)
                    if test_model.count_params() == model.count_params():
                        current_model = path
                        break
                except:
                    continue
    
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "current_model": current_model,
        "available_models": available_models,
        "num_classes": len(class_to_idx) if class_to_idx else 0,
        "class_mappings_loaded": class_to_idx is not None,
        "model_input_shape": model.input_shape if model else None
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Predict disease from uploaded image"""
    try:
        # Validate file type (handle None content_type)
        if file.content_type is None or not file.content_type.startswith('image/'):
            # Check file extension as fallback
            if file.filename:
                file_ext = file.filename.lower().split('.')[-1]
                if file_ext not in ['jpg', 'jpeg', 'png', 'bmp', 'gif']:
                    raise HTTPException(status_code=400, detail="File must be an image")
            else:
                raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image bytes
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Preprocess image
        image_array = preprocess_image(image_bytes)
        
        # Make prediction
        result = predict_disease(image_array)
        
        # Add metadata
        result["filename"] = file.filename
        result["file_size"] = len(image_bytes)
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in predict endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/classes")
async def get_classes():
    """Get list of all disease classes"""
    if not class_to_idx:
        raise HTTPException(status_code=500, detail="Class mappings not loaded")
    
    return {
        "classes": list(class_to_idx.keys()),
        "total_classes": len(class_to_idx)
    }

@app.post("/switch-model")
async def switch_model(model_name: str):
    """Switch to a different model"""
    global model
    
    model_path = f"models/{model_name}"
    
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
    
    try:
        # Load new model
        new_model = tf.keras.models.load_model(model_path)
        
        # Replace current model
        model = new_model
        
        logger.info(f"Switched to model: {model_name}")
        
        return {
            "message": f"Successfully switched to {model_name}",
            "model_path": model_path,
            "model_params": model.count_params()
        }
        
    except Exception as e:
        logger.error(f"Failed to switch model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@app.get("/models")
async def list_models():
    """List all available models"""
    available_models = []
    
    for model_path in MODEL_PATHS:
        if os.path.exists(model_path):
            try:
                test_model = tf.keras.models.load_model(model_path)
                available_models.append({
                    "path": model_path,
                    "name": os.path.basename(model_path),
                    "parameters": test_model.count_params(),
                    "input_shape": test_model.input_shape
                })
            except Exception as e:
                available_models.append({
                    "path": model_path,
                    "name": os.path.basename(model_path),
                    "error": str(e)
                })
    
    return {
        "available_models": available_models,
        "current_model": MODEL_PATH if model else None
    }

@app.get("/class/{class_name}")
async def get_class_info(class_name: str):
    """Get information about a specific class"""
    if not class_to_idx:
        raise HTTPException(status_code=500, detail="Class mappings not loaded")
    
    if class_name not in class_to_idx:
        raise HTTPException(status_code=404, detail=f"Class '{class_name}' not found")
    
    return {
        "class_name": class_name,
        "class_index": class_to_idx[class_name],
        "is_tomato": "Tomato" in class_name or class_name in TOMATO_CLASSES,
        "is_healthy": "Healthy" in class_name
    }

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "inference_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
