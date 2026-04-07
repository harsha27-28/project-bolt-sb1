#!/usr/bin/env python3
"""
Mini Training Script - Ultra Fast for Testing
Trains on small subset for quick testing
"""

import os
import numpy as np
import tensorflow as tf
from pathlib import Path
import json
from sklearn.model_selection import train_test_split
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
import warnings
warnings.filterwarnings('ignore')

# MINI Configuration - Ultra fast
CONFIG = {
    'img_size': (224, 224),
    'batch_size': 32,
    'epochs': 5,        # Only 5 epochs!
    'learning_rate': 0.001,
    'data_dir': 'data',
    'model_dir': 'models',
    'max_images_per_class': 100,  # Only 100 images per class
    'class_names': [
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
}

def load_mini_dataset():
    """Load small subset of dataset"""
    print("Loading MINI dataset (100 images per class)...")
    
    data_dir = Path(CONFIG['data_dir'])
    train_dir = data_dir / 'train'
    
    if not train_dir.exists():
        print(f"Training directory {train_dir} not found!")
        return None, None, None, None
    
    images = []
    labels = []
    class_to_idx = {}
    idx_to_class = {}
    
    # Create class mappings
    for class_idx, class_name in enumerate(CONFIG['class_names']):
        class_to_idx[class_name] = class_idx
        idx_to_class[class_idx] = class_name
    
    # Load small subset
    for class_name in CONFIG['class_names']:
        class_dir = train_dir / class_name
        if class_dir.exists():
            image_files = []
            for ext in ['*.jpg', '*.jpeg', '.png', '*.JPG']:
                image_files.extend(class_dir.glob(ext))
            
            # Take only first 100 images
            image_files = image_files[:CONFIG['max_images_per_class']]
            
            for img_path in image_files:
                images.append(str(img_path))
                labels.append(class_to_idx[class_name])
            
            print(f"{class_name}: {len(image_files)} images")
    
    if not images:
        print("No images found!")
        return None, None, None, None
    
    print(f"Total images: {len(images)}")
    
    # Convert to numpy arrays
    images = np.array(images)
    labels = np.array(labels)
    
    # Simple split
    X_train, X_test, y_train, y_test = train_test_split(
        images, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")
    
    return (X_train, y_train), (X_test, y_test), (class_to_idx, idx_to_class)

def create_mini_model(num_classes):
    """Create simple model"""
    base_model = MobileNetV2(
        input_shape=(*CONFIG['img_size'], 3),
        include_top=False,
        weights='imagenet'
    )
    
    base_model.trainable = False  # Keep frozen for speed
    
    inputs = tf.keras.Input(shape=(*CONFIG['img_size'], 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs, outputs)
    
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate']),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def train_mini():
    """Ultra fast mini training"""
    print("⚡ Starting MINI training (5 epochs, 100 images per class)...")
    
    Path(CONFIG['model_dir']).mkdir(exist_ok=True)
    
    # Load mini dataset
    train_data, test_data, class_mappings = load_mini_dataset()
    
    if train_data is None:
        return
    
    (X_train, y_train), (X_test, y_test) = train_data, test_data
    class_to_idx, idx_to_class = class_mappings
    
    num_classes = len(class_to_idx)
    
    # Create simple data generator
    train_datagen = ImageDataGenerator(rescale=1./255)
    
    def load_image(image_path):
        img = tf.io.read_file(image_path)
        img = tf.image.decode_jpeg(img, channels=3)
        img = tf.image.resize(img, CONFIG['img_size'])
        return img
    
    def create_dataset(image_paths, labels):
        dataset = tf.data.Dataset.from_tensor_slices((image_paths, labels))
        
        def load_and_preprocess(image_path, label):
            img = load_image(image_path)
            img = tf.cast(img, tf.float32) / 255.0
            return img, label
        
        dataset = dataset.map(load_and_preprocess)
        dataset = dataset.batch(CONFIG['batch_size'])
        dataset = dataset.prefetch(tf.data.AUTOTUNE)
        
        return dataset
    
    train_dataset = create_dataset(X_train, y_train)
    test_dataset = create_dataset(X_test, y_test)
    
    # Create model
    model = create_mini_model(num_classes)
    
    print(f"Model created with {model.count_params():,} parameters")
    
    # Train model
    print("Training...")
    history = model.fit(
        train_dataset,
        validation_data=test_dataset,
        epochs=CONFIG['epochs'],
        verbose=1
    )
    
    # Evaluate
    test_loss, test_accuracy = model.evaluate(test_dataset, verbose=0)
    print(f"Test Accuracy: {test_accuracy:.4f}")
    
    # Save model
    model.save(f"{CONFIG['model_dir']}/mini_model.h5")
    
    # Save class mappings
    with open(f"{CONFIG['model_dir']}/class_mappings.json", 'w') as f:
        json.dump({
            'class_to_idx': class_to_idx,
            'idx_to_class': idx_to_class
        }, f, indent=2)
    
    print(f"Mini model saved to {CONFIG['model_dir']}/")
    print("✅ Mini training completed!")

if __name__ == "__main__":
    train_mini()
