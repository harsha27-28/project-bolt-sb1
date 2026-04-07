#!/usr/bin/env python3
"""
Test script for the updated inference API
Tests the API with the fast training model
"""

import requests
import json
from pathlib import Path

def test_api():
    """Test the inference API"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Tomato Disease Detection API...")
    
    # Test 1: Health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ API is healthy")
            print(f"   Model loaded: {health_data.get('model_loaded', False)}")
            print(f"   Current model: {health_data.get('current_model', 'Unknown')}")
            print(f"   Available models: {health_data.get('available_models', [])}")
            print(f"   Classes: {health_data.get('num_classes', 0)}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        print("Make sure the API is running: python inference_api.py")
        return False
    
    # Test 2: List models
    print("\n2. Testing model listing...")
    try:
        response = requests.get(f"{base_url}/models")
        if response.status_code == 200:
            models_data = response.json()
            print(f"✅ Available models:")
            for model in models_data.get('available_models', []):
                print(f"   - {model.get('name', 'Unknown')}: {model.get('parameters', 'Unknown')} parameters")
        else:
            print(f"❌ Model listing failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Model listing error: {e}")
    
    # Test 3: List classes
    print("\n3. Testing class listing...")
    try:
        response = requests.get(f"{base_url}/classes")
        if response.status_code == 200:
            classes_data = response.json()
            print(f"✅ Available classes ({classes_data.get('total_classes', 0)}):")
            for class_name in classes_data.get('classes', []):
                print(f"   - {class_name}")
        else:
            print(f"❌ Class listing failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Class listing error: {e}")
    
    # Test 4: Test prediction (if we have a test image)
    print("\n4. Testing prediction...")
    test_image_path = None
    
    # Look for any test image in the data directory
    data_dir = Path("data")
    if data_dir.exists():
        for split in ["train", "validation", "test"]:
            split_dir = data_dir / split
            if split_dir.exists():
                for class_dir in split_dir.iterdir():
                    if class_dir.is_dir():
                        for img_file in class_dir.glob("*.JPG"):
                            test_image_path = img_file
                            break
                        if test_image_path:
                            break
                    if test_image_path:
                        break
            if test_image_path:
                break
    
    if test_image_path:
        try:
            print(f"   Using test image: {test_image_path}")
            
            # Read image file properly
            with open(test_image_path, 'rb') as f:
                image_data = f.read()
            
            # Create proper file upload
            files = {
                'file': (test_image_path.name, image_data, 'image/jpeg')
            }
            
            response = requests.post(f"{base_url}/predict", files=files)
            
            if response.status_code == 200:
                prediction_data = response.json()
                print(f"✅ Prediction successful!")
                print(f"   Predicted class: {prediction_data.get('predicted_class', 'Unknown')}")
                print(f"   Confidence: {prediction_data.get('confidence', 0):.2%}")
                print(f"   Top predictions:")
                for pred in prediction_data.get('top_predictions', [])[:3]:
                    print(f"     - {pred.get('class', 'Unknown')}: {pred.get('confidence', 0):.2%}")
            else:
                print(f"❌ Prediction failed: {response.status_code}")
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"❌ Prediction error: {e}")
    else:
        print("⚠️  No test image found. Skipping prediction test.")
        print("   To test predictions, add an image to the data directory")
    
    print("\n🎉 API testing completed!")
    return True

if __name__ == "__main__":
    test_api()
