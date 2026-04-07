#!/usr/bin/env python3
"""
Dataset Organization Script
Organizes PlantVillage dataset into clean train/validation/test structure
"""

import os
import shutil
from pathlib import Path
from sklearn.model_selection import train_test_split
import random

def organize_dataset():
    """Organize PlantVillage dataset into clean structure"""
    
    # Source and destination paths
    source_dir = Path("PlantVillage/PlantVillage")
    dest_dir = Path("data")
    
    # Create destination directories
    train_dir = dest_dir / "train"
    val_dir = dest_dir / "validation"
    test_dir = dest_dir / "test"
    
    for split_dir in [train_dir, val_dir, test_dir]:
        split_dir.mkdir(parents=True, exist_ok=True)
    
    # Tomato disease classes from your dataset
    tomato_classes = [
        "Tomato_Bacterial_spot",
        "Tomato_Early_blight", 
        "Tomato_Late_blight",
        "Tomato_Leaf_Mold",
        "Tomato_Septoria_leaf_spot",
        "Tomato_Spider_mites_Two_spotted_spider_mite",
        "Tomato__Target_Spot",
        "Tomato__Tomato_mosaic_virus",
        "Tomato__Tomato_YellowLeaf__Curl_Virus",
        "Tomato_healthy"
    ]
    
    # Clean class names for destination folders
    clean_class_names = {
        "Tomato_Bacterial_spot": "Bacterial_spot",
        "Tomato_Early_blight": "Early_blight",
        "Tomato_Late_blight": "Late_blight", 
        "Tomato_Leaf_Mold": "Leaf_Mold",
        "Tomato_Septoria_leaf_spot": "Septoria_leaf_spot",
        "Tomato_Spider_mites_Two_spotted_spider_mite": "Spider_mites",
        "Tomato__Target_Spot": "Target_Spot",
        "Tomato__Tomato_mosaic_virus": "Tomato_mosaic_virus",
        "Tomato__Tomato_YellowLeaf__Curl_Virus": "Tomato_YellowLeaf_Curl_Virus",
        "Tomato_healthy": "Healthy"
    }
    
    print("Organizing dataset...")
    
    for class_name in tomato_classes:
        if not (source_dir / class_name).exists():
            print(f"Warning: {class_name} not found, skipping...")
            continue
            
        clean_name = clean_class_names[class_name]
        print(f"Processing {class_name} -> {clean_name}")
        
        # Get all image files
        image_files = []
        for ext in ['*.JPG', '*.jpg', '*.jpeg', '*.png']:
            image_files.extend((source_dir / class_name).glob(ext))
        
        print(f"  Found {len(image_files)} images")
        
        if len(image_files) == 0:
            print(f"  No images found for {class_name}")
            continue
        
        # Split data: 70% train, 15% validation, 15% test
        train_files, temp_files = train_test_split(
            image_files, test_size=0.3, random_state=42
        )
        val_files, test_files = train_test_split(
            temp_files, test_size=0.5, random_state=42
        )
        
        # Create class directories
        for split_dir, files in [(train_dir, train_files), (val_dir, val_files), (test_dir, test_files)]:
            class_dir = split_dir / clean_name
            class_dir.mkdir(exist_ok=True)
            
            # Copy files
            for img_file in files:
                dest_file = class_dir / img_file.name
                shutil.copy2(img_file, dest_file)
        
        print(f"  Train: {len(train_files)}, Val: {len(val_files)}, Test: {len(test_files)}")
    
    print("\nDataset organization complete!")
    print(f"Data structure:")
    print(f"  {dest_dir}/")
    print(f"    train/")
    print(f"    validation/")
    print(f"    test/")
    
    # Print final statistics
    for split in ['train', 'validation', 'test']:
        split_path = dest_dir / split
        total_images = sum(len(list(class_dir.glob('*'))) for class_dir in split_path.iterdir() if class_dir.is_dir())
        print(f"  {split}: {total_images} images across {len(list(split_path.iterdir()))} classes")

if __name__ == "__main__":
    organize_dataset()
