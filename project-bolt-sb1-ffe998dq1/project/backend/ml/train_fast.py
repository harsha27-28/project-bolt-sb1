#!/usr/bin/env python3
"""
Fast Training Script for Tomato Disease Detection
Optimized for speed with smaller model and fewer epochs
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from tensorflow.keras.optimizers import Adam
import warnings
warnings.filterwarnings('ignore')

# FAST Configuration - Optimized for speed
CONFIG = {
    'img_size': (224, 224),
    'batch_size': 64,  # Increased batch size
    'epochs': 10,      # Reduced epochs
    'learning_rate': 0.001,
    'validation_split': 0.2,
    'test_split': 0.1,
    'random_seed': 42,
    'data_dir': 'data',
    'model_dir': 'models',
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

def setup_directories():
    """Create necessary directories"""
    Path(CONFIG['model_dir']).mkdir(exist_ok=True)
    Path('logs').mkdir(exist_ok=True)

def load_and_preprocess_data():
    """Load dataset with sampling for faster training"""
    print("Loading dataset with sampling for faster training...")
    
    data_dir = Path(CONFIG['data_dir'])
    train_dir = data_dir / 'train'
    
    if not train_dir.exists():
        print(f"Training directory {train_dir} not found!")
        print("Please run organize_dataset.py first")
        return None, None, None, None
    
    # Load images and labels with sampling (max 500 images per class)
    images = []
    labels = []
    class_to_idx = {}
    idx_to_class = {}
    
    # Create class mappings
    for class_idx, class_name in enumerate(CONFIG['class_names']):
        class_to_idx[class_name] = class_idx
        idx_to_class[class_idx] = class_name
    
    # Load from train directory with sampling
    for class_name in CONFIG['class_names']:
        class_dir = train_dir / class_name
        if class_dir.exists():
            # Get all image files
            image_files = []
            for ext in ['*.jpg', '*.jpeg', '.png', '*.JPG']:
                image_files.extend(class_dir.glob(ext))
            
            # Sample max 500 images per class for faster training
            if len(image_files) > 500:
                import random
                image_files = random.sample(image_files, 500)
            
            for img_path in image_files:
                images.append(str(img_path))
                labels.append(class_to_idx[class_name])
            
            print(f"{class_name}: {len(image_files)} images")
    
    if not images:
        print("No images found!")
        return None, None, None, None
    
    print(f"Total training images: {len(images)}")
    
    # Convert to numpy arrays
    images = np.array(images)
    labels = np.array(labels)
    
    # Split data
    X_temp, X_test, y_temp, y_test = train_test_split(
        images, labels, test_size=CONFIG['test_split'], 
        random_state=CONFIG['random_seed'], stratify=labels
    )
    
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=CONFIG['validation_split']/(1-CONFIG['test_split']),
        random_state=CONFIG['random_seed'], stratify=y_temp
    )
    
    print(f"Train: {len(X_train)}, Validation: {len(X_val)}, Test: {len(X_test)}")
    
    return (X_train, y_train), (X_val, y_val), (X_test, y_test), (class_to_idx, idx_to_class)

def create_data_generators(X_train, y_train, X_val, y_val):
    """Create data generators with minimal augmentation for speed"""
    
    # Minimal augmentation for speed
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=10,  # Reduced
        horizontal_flip=True,
        zoom_range=0.1      # Reduced
    )
    
    val_datagen = ImageDataGenerator(rescale=1./255)
    
    def load_and_preprocess_image(image_path):
        """Load and preprocess a single image"""
        img = tf.io.read_file(image_path)
        img = tf.image.decode_jpeg(img, channels=3)
        img = tf.image.resize(img, CONFIG['img_size'])
        return img
    
    def create_dataset(image_paths, labels, datagen, shuffle=False):
        """Create TensorFlow dataset"""
        dataset = tf.data.Dataset.from_tensor_slices((image_paths, labels))
        
        def load_image(image_path, label):
            img = load_and_preprocess_image(image_path)
            img = tf.cast(img, tf.float32) / 255.0
            return img, label
        
        dataset = dataset.map(load_image, num_parallel_calls=tf.data.AUTOTUNE)
        
        if shuffle:
            dataset = dataset.shuffle(buffer_size=1000)
        
        dataset = dataset.batch(CONFIG['batch_size'])
        dataset = dataset.prefetch(tf.data.AUTOTUNE)
        
        return dataset
    
    train_dataset = create_dataset(X_train, y_train, train_datagen, shuffle=True)
    val_dataset = create_dataset(X_val, y_val, val_datagen, shuffle=False)
    
    return train_dataset, val_dataset

def create_fast_model(num_classes):
    """Create MobileNetV2-based model optimized for speed"""
    
    # Use MobileNetV2 (faster than InceptionV3)
    base_model = MobileNetV2(
        input_shape=(*CONFIG['img_size'], 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Freeze base model initially
    base_model.trainable = False
    
    # Simple classification head
    inputs = tf.keras.Input(shape=(*CONFIG['img_size'], 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs, outputs)
    
    # Compile model
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate']),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model, base_model

def train_fast_model():
    """Fast training function"""
    print("🚀 Starting FAST training...")
    print(f"Configuration: {CONFIG['epochs']} epochs, batch size {CONFIG['batch_size']}")
    
    setup_directories()
    
    # Load data
    train_data, val_data, test_data, class_mappings = load_and_preprocess_data()
    
    if train_data is None:
        return
    
    (X_train, y_train), (X_val, y_val), (X_test, y_test) = train_data, val_data, test_data
    class_to_idx, idx_to_class = class_mappings
    
    num_classes = len(class_to_idx)
    print(f"Number of classes: {num_classes}")
    
    # Create data generators
    train_dataset, val_dataset = create_data_generators(X_train, y_train, X_val, y_val)
    
    # Create model
    model, base_model = create_fast_model(num_classes)
    
    print(f"Model created with {model.count_params():,} parameters")
    
    # Minimal callbacks for speed
    callbacks = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=3,  # Reduced patience
            restore_best_weights=True,
            verbose=1
        ),
        ModelCheckpoint(
            filepath=f"{CONFIG['model_dir']}/fast_model.h5",
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]
    
    # Train model
    print("Training model...")
    history = model.fit(
        train_dataset,
        validation_data=val_dataset,
        epochs=CONFIG['epochs'],
        callbacks=callbacks,
        verbose=1
    )
    
    # Quick fine-tuning (only 5 epochs)
    print("Quick fine-tuning...")
    base_model.trainable = True
    
    # Fine-tune from this layer onwards
    fine_tune_at = len(base_model.layers) - 20  # Fewer layers
    
    # Freeze all the layers before the `fine_tune_at` layer
    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False
    
    # Recompile with lower learning rate
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate']/10),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    print(f"Fine-tuning from layer {fine_tune_at}")
    
    # Continue training for only 5 epochs
    history_fine = model.fit(
        train_dataset,
        validation_data=val_dataset,
        epochs=5,  # Only 5 epochs for fine-tuning
        initial_epoch=len(history.history['loss']),
        callbacks=callbacks,
        verbose=1
    )
    
    # Evaluate on test set
    print("Evaluating on test set...")
    test_dataset, _ = create_data_generators(X_test, y_test, X_test, y_test)
    test_loss, test_accuracy = model.evaluate(test_dataset, verbose=0)
    print(f"Test Accuracy: {test_accuracy:.4f}")
    
    # Save model and metadata
    model.save(f"{CONFIG['model_dir']}/fast_model_final.h5")
    
    # Save class mappings
    with open(f"{CONFIG['model_dir']}/class_mappings.json", 'w') as f:
        json.dump({
            'class_to_idx': class_to_idx,
            'idx_to_class': idx_to_class
        }, f, indent=2)
    
    print(f"Fast model saved to {CONFIG['model_dir']}/")
    print("✅ Fast training completed!")
    
    # Plot training history
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 2, 1)
    plt.plot(history.history['loss'], label='Training Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history['accuracy'], label='Training Accuracy')
    plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
    plt.title('Model Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    
    plt.tight_layout()
    plt.savefig(f"{CONFIG['model_dir']}/fast_training_history.png", dpi=300, bbox_inches='tight')
    plt.show()

if __name__ == "__main__":
    train_fast_model()
