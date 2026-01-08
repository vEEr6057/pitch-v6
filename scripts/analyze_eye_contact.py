#!/usr/bin/env python3
"""
Eye Contact Analysis using MediaPipe Face Mesh
Detects face landmarks and calculates gaze direction to determine camera eye contact
"""

import cv2
import mediapipe as mp
import numpy as np
import sys
import json
import os

def calculate_gaze_score(video_path):
    """
    Analyze video for eye contact using MediaPipe Face Mesh
    Returns score (0-100) based on percentage of frames with forward gaze
    """
    
    # Initialize MediaPipe Face Mesh
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "error": "Failed to open video file",
            "score": 0,
            "details": {
                "totalFrames": 0,
                "eyeContactFrames": 0,
                "faceDetectionRate": 0
            }
        }
    
    total_frames = 0
    face_detected_frames = 0
    eye_contact_frames = 0
    
    # Process every 3rd frame for performance (adjust as needed)
    frame_skip = 3
    frame_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        if frame_count % frame_skip != 0:
            continue
        
        total_frames += 1
        
        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process frame
        results = face_mesh.process(rgb_frame)
        
        if results.multi_face_landmarks:
            face_detected_frames += 1
            landmarks = results.multi_face_landmarks[0]
            
            # Get key landmark points for gaze estimation
            # Iris centers: left (468), right (473)
            # Nose tip: (1)
            # Face center: (6)
            
            h, w, _ = frame.shape
            
            # Get landmark coordinates
            left_iris = landmarks.landmark[468]
            right_iris = landmarks.landmark[473]
            nose_tip = landmarks.landmark[1]
            face_center = landmarks.landmark[6]
            
            # Convert normalized coordinates to pixel coordinates
            left_iris_px = np.array([left_iris.x * w, left_iris.y * h])
            right_iris_px = np.array([right_iris.x * w, right_iris.y * h])
            nose_tip_px = np.array([nose_tip.x * w, nose_tip.y * h])
            face_center_px = np.array([face_center.x * w, face_center.y * h])
            
            # Calculate eye center
            eye_center = (left_iris_px + right_iris_px) / 2
            
            # Calculate gaze vector (simplified)
            # Forward gaze: eyes should be centered relative to face landmarks
            horizontal_offset = abs(eye_center[0] - face_center_px[0]) / w
            vertical_offset = abs(eye_center[1] - nose_tip_px[1]) / h
            
            # Threshold for "looking at camera" (tune these values)
            # Lower thresholds = stricter eye contact detection
            horizontal_threshold = 0.08  # 8% of frame width
            vertical_threshold = 0.06    # 6% of frame height
            
            # Check if gaze is within threshold (looking at camera)
            if horizontal_offset < horizontal_threshold and vertical_offset < vertical_threshold:
                eye_contact_frames += 1
    
    cap.release()
    face_mesh.close()
    
    # Calculate scores
    if total_frames == 0:
        return {
            "error": "No frames processed",
            "score": 0,
            "details": {
                "totalFrames": 0,
                "eyeContactFrames": 0,
                "faceDetectionRate": 0
            }
        }
    
    face_detection_rate = face_detected_frames / total_frames if total_frames > 0 else 0
    eye_contact_score = int((eye_contact_frames / total_frames) * 100) if total_frames > 0 else 0
    
    return {
        "score": eye_contact_score,
        "details": {
            "totalFrames": total_frames,
            "eyeContactFrames": eye_contact_frames,
            "faceDetectionRate": round(face_detection_rate, 2)
        }
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Video path required"}))
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    if not os.path.exists(video_path):
        print(json.dumps({"error": f"Video file not found: {video_path}"}))
        sys.exit(1)
    
    try:
        result = calculate_gaze_score(video_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "error": f"Analysis failed: {str(e)}",
            "score": 0,
            "details": {
                "totalFrames": 0,
                "eyeContactFrames": 0,
                "faceDetectionRate": 0
            }
        }))
        sys.exit(1)
