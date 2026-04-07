#!/usr/bin/env python3
"""
Tomato and Lady's Finger Disease Detection Model Training
Uses transfer learning with MobileNetV2 for multi-class disease classification.
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
from tensorflow.keras.utils import to_categorical
import warnings
warnings.filterwarnings('ignore')

# Configuration
CONFIG = {
    'img_size': (224, 224),
    'batch_size': 32,
    'epochs': 30,
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
    Path(CONFIG['data_dir']).mkdir(exist_ok=True)
    Path(CONFIG['model_dir']).mkdir(exist_ok=True)
    Path('logs').mkdir(exist_ok=True)

def load_and_preprocess_data():
    """Load dataset and create train/validation/test splits"""
    print("Loading dataset...")
    
    # Expected dataset structure (after organization):
    # data/
    #   train/
    #     Bacterial_spot/
    #     Early_blight/
    #     Late_blight/
    #     Leaf_Mold/
    #     Septoria_leaf_spot/
    #     Spider_mites/
    #     Target_Spot/
    #     Tomato_mosaic_virus/
    #     Tomato_YellowLeaf_Curl_Virus/
    #     Healthy/
    #   validation/
    #     [same structure]
    #   test/
    #     [same structure]
    
    data_dir = Path(CONFIG['data_dir'])
    if not data_dir.exists():
        print(f"Data directory {data_dir} not found!")
        print("Please run organize_dataset.py first to organize your PlantVillage dataset")
        return None, None, None, None
    
    # Check if organized structure exists
    train_dir = data_dir / 'train'
    val_dir = data_dir / 'validation'
    test_dir = data_dir / 'test'
    
    if not all([train_dir.exists(), val_dir.exists(), test_dir.exists()]):
        print("Organized dataset structure not found!")
        print("Please run organize_dataset.py first")
        return None, None, None, None
    
    # Load images and labels from organized structure
    images = []
    labels = []
    class_to_idx = {}
    idx_to_class = {}
    
    # Create class mappings
    for class_idx, class_name in enumerate(CONFIG['class_names']):
        class_to_idx[class_name] = class_idx
        idx_to_class[class_idx] = class_name
    
    # Load from train directory
    for class_name in CONFIG['class_names']:
        class_dir = train_dir / class_name
        if class_dir.exists():
            for img_path in class_dir.glob('*'):
                if img_path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                    images.append(str(img_path))
                    labels.append(class_to_idx[class_name])
    
    if not images:
        print("No images found! Please check your dataset structure.")
        return None, None, None, None
    
    print(f"Found {len(images)} training images across {len(set(labels))} classes")
    
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
    """Create data generators with augmentation"""
    
    # Data augmentation for training
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        zoom_range=0.2,
        brightness_range=[0.8, 1.2],
        fill_mode='nearest'
    )
    
    # No augmentation for validation
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

def create_model(num_classes):
    """Create MobileNetV2-based model with transfer learning"""
    
    # Load pre-trained MobileNetV2
    base_model = MobileNetV2(
        input_shape=(*CONFIG['img_size'], 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Freeze base model initially
    base_model.trainable = False
    
    # Add custom classification head
    inputs = tf.keras.Input(shape=(*CONFIG['img_size'], 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(512, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs, outputs)
    
    # Compile model
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate']),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model, base_model

def train_model():
    """Main training function"""
    print("Setting up directories...")
    setup_directories()
    
    print("Loading data...")
    train_data, val_data, test_data, class_mappings = load_and_preprocess_data()
    
    if train_data is None:
        return
    
    (X_train, y_train), (X_val, y_val), (X_test, y_test) = train_data, val_data, test_data
    class_to_idx, idx_to_class = class_mappings
    
    num_classes = len(class_to_idx)
    print(f"Number of classes: {num_classes}")
    
    # Create data generators
    print("Creating data generators...")
    train_dataset, val_dataset = create_data_generators(X_train, y_train, X_val, y_val)
    
    # Create model
    print("Creating model...")
    model, base_model = create_model(num_classes)
    
    print(f"Model created with {model.count_params():,} parameters")
    
    # Callbacks
    callbacks = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        ),
        ModelCheckpoint(
            filepath=f"{CONFIG['model_dir']}/best_model.h5",
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]
    
    # Train model
    print("Starting training...")
    history = model.fit(
        train_dataset,
        validation_data=val_dataset,
        epochs=CONFIG['epochs'],
        callbacks=callbacks,
        verbose=1
    )
    
    # Fine-tuning: Unfreeze some layers
    print("Fine-tuning...")
    base_model.trainable = True
    
    # Fine-tune from this layer onwards
    fine_tune_at = len(base_model.layers) - 30
    
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
    print(f"Trainable layers: {sum([layer.trainable for layer in model.layers])}")
    
    # Continue training
    history_fine = model.fit(
        train_dataset,
        validation_data=val_dataset,
        epochs=CONFIG['epochs'],
        initial_epoch=len(history.history['loss']),
        callbacks=callbacks,
        verbose=1
    )
    
    # Evaluate on test set
    print("Evaluating on test set...")
    test_dataset, _ = create_data_generators(X_test, y_test, X_test, y_test)
    test_loss, test_accuracy = model.evaluate(test_dataset, verbose=0)
    print(f"Test Accuracy: {test_accuracy:.4f}")
    
    # Generate predictions for detailed evaluation
    test_predictions = model.predict(test_dataset)
    test_pred_classes = np.argmax(test_predictions, axis=1)
    
    # Classification report
    print("\nClassification Report:")
    print(classification_report(y_test, test_pred_classes, target_names=list(class_to_idx.keys())))
    
    # Confusion matrix
    cm = confusion_matrix(y_test, test_pred_classes)
    plt.figure(figsize=(12, 10))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=list(class_to_idx.keys()),
                yticklabels=list(class_to_idx.keys()))
    plt.title('Confusion Matrix')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.xticks(rotation=45)
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(f"{CONFIG['model_dir']}/confusion_matrix.png", dpi=300, bbox_inches='tight')
    plt.show()
    
    # Save model and metadata
    model.save(f"{CONFIG['model_dir']}/final_model.h5")
    
    # Save class mappings
    with open(f"{CONFIG['model_dir']}/class_mappings.json", 'w') as f:
        json.dump({
            'class_to_idx': class_to_idx,
            'idx_to_class': idx_to_class
        }, f, indent=2)
    
    # Save training history
    combined_history = {
        'loss': history.history['loss'] + history_fine.history['loss'],
        'accuracy': history.history['accuracy'] + history_fine.history['accuracy'],
        'val_loss': history.history['val_loss'] + history_fine.history['val_loss'],
        'val_accuracy': history.history['val_accuracy'] + history_fine.history['val_accuracy']
    }
    
    with open(f"{CONFIG['model_dir']}/training_history.json", 'w') as f:
        json.dump(combined_history, f, indent=2)
    
    # Plot training history
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 2, 1)
    plt.plot(combined_history['loss'], label='Training Loss')
    plt.plot(combined_history['val_loss'], label='Validation Loss')
    plt.title('Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(combined_history['accuracy'], label='Training Accuracy')
    plt.plot(combined_history['val_accuracy'], label='Validation Accuracy')
    plt.title('Model Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    
    plt.tight_layout()
    plt.savefig(f"{CONFIG['model_dir']}/training_history.png", dpi=300, bbox_inches='tight')
    plt.show()
    
    print(f"Model saved to {CONFIG['model_dir']}/")
    print("Training completed!")

if __name__ == "__main__":
    train_model()
