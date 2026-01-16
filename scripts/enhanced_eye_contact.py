#!/usr/bin/env python3
"""
Enhanced Eye Contact Analysis using MediaPipe Face Mesh
Combines head pose estimation (solvePnP) with iris gaze tracking
for accurate camera eye contact detection
"""

import cv2
import mediapipe as mp
import numpy as np
import sys
import json
import os


class EyeContactAnalyzer:
    """Advanced eye contact analyzer with head pose and gaze estimation"""
    
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,  # Enable iris landmarks
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # 3D model points for head pose estimation (in mm)
        self.model_points = np.array([
            (0.0, 0.0, 0.0),             # Nose tip (landmark 1)
            (0.0, -330.0, -65.0),        # Chin (landmark 152)
            (-225.0, 170.0, -135.0),     # Left eye left corner (landmark 33)
            (225.0, 170.0, -135.0),      # Right eye right corner (landmark 263)
            (-150.0, -150.0, -125.0),    # Left mouth corner (landmark 61)
            (150.0, -150.0, -125.0)      # Right mouth corner (landmark 291)
        ], dtype=np.float64)
    
    def estimate_head_pose(self, landmarks, frame_shape):
        """
        Estimate head pose using solvePnP
        Returns: (yaw, pitch, roll) in degrees
        """
        h, w = frame_shape[:2]
        
        # 2D image points from landmarks
        image_points = np.array([
            (landmarks[1].x * w, landmarks[1].y * h),      # Nose tip
            (landmarks[152].x * w, landmarks[152].y * h),  # Chin
            (landmarks[33].x * w, landmarks[33].y * h),    # Left eye left corner
            (landmarks[263].x * w, landmarks[263].y * h),  # Right eye right corner
            (landmarks[61].x * w, landmarks[61].y * h),    # Left mouth corner
            (landmarks[291].x * w, landmarks[291].y * h)   # Right mouth corner
        ], dtype=np.float64)
        
        # Camera matrix (simplified)
        focal_length = w
        center = (w / 2, h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)
        
        # Distortion coefficients (assume no distortion)
        dist_coeffs = np.zeros((4, 1))
        
        # Solve PnP
        success, rotation_vector, translation_vector = cv2.solvePnP(
            self.model_points,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )
        
        if not success:
            return 0, 0, 0
        
        # Convert rotation vector to rotation matrix
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        
        # Extract Euler angles
        # Using decomposition method
        pose_matrix = cv2.hconcat((rotation_matrix, translation_vector))
        _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(pose_matrix)
        
        pitch = euler_angles[0][0]
        yaw = euler_angles[1][0]
        roll = euler_angles[2][0]
        
        return yaw, pitch, roll
    
    def estimate_gaze_direction(self, landmarks, frame_shape):
        """
        Estimate gaze direction from iris positions
        Returns: (horizontal_angle, vertical_angle) in degrees
        """
        h, w = frame_shape[:2]
        
        # Get iris centers (MediaPipe provides iris landmarks when refine_landmarks=True)
        # Left iris: 468, Right iris: 473
        left_iris = landmarks[468]
        right_iris = landmarks[473]
        
        # Get eye corners for reference
        left_eye_left = landmarks[33]
        left_eye_right = landmarks[133]
        right_eye_left = landmarks[362]
        right_eye_right = landmarks[263]
        
        # Calculate iris position relative to eye corners
        # Left eye
        left_eye_width = abs(left_eye_right.x - left_eye_left.x)
        if left_eye_width > 0:
            left_iris_offset = (left_iris.x - left_eye_left.x) / left_eye_width
        else:
            left_iris_offset = 0.5
        
        # Right eye
        right_eye_width = abs(right_eye_right.x - right_eye_left.x)
        if right_eye_width > 0:
            right_iris_offset = (right_iris.x - right_eye_left.x) / right_eye_width
        else:
            right_iris_offset = 0.5
        
        # Average iris offset (0.5 = center, <0.5 = looking left, >0.5 = looking right)
        avg_horizontal_offset = (left_iris_offset + right_iris_offset) / 2
        
        # Convert to angle (approximate)
        # Assuming ±30° range for full eye movement
        horizontal_angle = (avg_horizontal_offset - 0.5) * 60
        
        # Vertical gaze estimation
        # Get eye vertical centers
        left_eye_top = landmarks[159]
        left_eye_bottom = landmarks[145]
        right_eye_top = landmarks[386]
        right_eye_bottom = landmarks[374]
        
        # Calculate vertical iris position
        left_eye_height = abs(left_eye_bottom.y - left_eye_top.y)
        if left_eye_height > 0:
            left_iris_v_offset = (left_iris.y - left_eye_top.y) / left_eye_height
        else:
            left_iris_v_offset = 0.5
        
        right_eye_height = abs(right_eye_bottom.y - right_eye_top.y)
        if right_eye_height > 0:
            right_iris_v_offset = (right_iris.y - right_eye_top.y) / right_eye_height
        else:
            right_iris_v_offset = 0.5
        
        avg_vertical_offset = (left_iris_v_offset + right_iris_v_offset) / 2
        
        # Convert to angle (approximate)
        # Assuming ±20° range for vertical eye movement
        vertical_angle = (avg_vertical_offset - 0.5) * 40
        
        return horizontal_angle, vertical_angle
    
    def is_looking_at_camera(self, yaw, pitch, gaze_h, gaze_v, thresholds):
        """
        Determine if person is looking at camera
        Combines head pose and gaze direction
        """
        head_threshold = thresholds.get('head', 20)  # ±20° for head pose
        gaze_threshold = thresholds.get('gaze', 15)  # ±15° for gaze
        
        # Normalize pitch: solvePnP sometimes returns ±180° for 0° (facing forward)
        # Convert to range [-180, 180] then normalize
        if pitch > 150 or pitch < -150:
            # If pitch is near ±180°, it's actually close to 0° (facing forward)
            normalized_pitch = 180 - abs(pitch) if pitch > 0 else -180 - pitch
        else:
            normalized_pitch = pitch
        
        # Check head pose (yaw and pitch should be near 0)
        head_centered = abs(yaw) < head_threshold and abs(normalized_pitch) < head_threshold
        
        # Check gaze direction (should be centered)
        gaze_centered = abs(gaze_h) < gaze_threshold and abs(gaze_v) < gaze_threshold
        
        # Both conditions should be met for eye contact
        # OR if head is very centered, gaze can be slightly off
        if head_centered and gaze_centered:
            return True
        elif abs(yaw) < 10 and abs(normalized_pitch) < 10:
            # Very centered head, relax gaze threshold
            return abs(gaze_h) < 20 and abs(gaze_v) < 20
        else:
            return False
    
    def analyze_video(self, video_path, sample_fps=8):
        """
        Analyze video for eye contact
        Returns: score (0-100), confidence, and detailed metrics
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {
                "error": "Failed to open video",
                "score": 0,
                "confidence": 0.0,
                "details": {
                    "totalFrames": 0,
                    "eyeContactFrames": 0,
                    "faceDetectionRate": 0.0
                }
            }
        
        # Get video FPS
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        if video_fps <= 0 or video_fps > 120:
            # Invalid FPS or unrealistic value (webm sometimes reports 1000+)
            video_fps = 30  # Default fallback
        
        frame_skip = max(1, int(video_fps / sample_fps))
        
        # Safety check: don't skip more than 10 frames at a time
        # This ensures we get at least 1 frame per second even with bad metadata
        if frame_skip > 10:
            frame_skip = 4  # Sample at ~7.5 FPS for 30fps video
        
        total_frames = 0
        face_detected_frames = 0
        eye_contact_frames = 0
        frame_count = 0
        
        # Thresholds for eye contact detection
        thresholds = {
            'head': 20,  # Head pose tolerance (degrees)
            'gaze': 15   # Gaze tolerance (degrees)
        }
        
        print(f"[EyeContactAnalyzer] Processing video at {sample_fps} FPS (skip every {frame_skip} frames)", file=sys.stderr)
        
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
            results = self.face_mesh.process(rgb_frame)
            
            if results.multi_face_landmarks:
                face_detected_frames += 1
                landmarks = results.multi_face_landmarks[0].landmark
                
                try:
                    # Estimate head pose
                    yaw, pitch, roll = self.estimate_head_pose(landmarks, frame.shape)
                    
                    # Estimate gaze direction
                    gaze_h, gaze_v = self.estimate_gaze_direction(landmarks, frame.shape)
                    
                    # Check if looking at camera
                    if self.is_looking_at_camera(yaw, pitch, gaze_h, gaze_v, thresholds):
                        eye_contact_frames += 1
                    
                    # Debug output (optional)
                    if total_frames % 30 == 0:
                        print(f"[EyeContactAnalyzer] Frame {total_frames}: yaw={yaw:.1f}°, pitch={pitch:.1f}°, gaze_h={gaze_h:.1f}°, gaze_v={gaze_v:.1f}°", file=sys.stderr)
                
                except Exception as e:
                    print(f"[EyeContactAnalyzer] Error processing frame {total_frames}: {e}", file=sys.stderr)
                    continue
        
        cap.release()
        self.face_mesh.close()
        
        # Calculate metrics
        if total_frames == 0:
            return {
                "error": "No frames processed",
                "score": 0,
                "confidence": 0.0,
                "details": {
                    "totalFrames": 0,
                    "eyeContactFrames": 0,
                    "faceDetectionRate": 0.0
                }
            }
        
        face_detection_rate = face_detected_frames / total_frames
        eye_contact_ratio = eye_contact_frames / total_frames
        eye_contact_score = int(eye_contact_ratio * 100)
        
        # Confidence based on face detection rate
        # High confidence if face detected in >80% of frames
        confidence = min(face_detection_rate, 1.0)
        
        print(f"[EyeContactAnalyzer] Analysis complete: {eye_contact_frames}/{total_frames} frames with eye contact", file=sys.stderr)
        
        return {
            "score": eye_contact_score,
            "confidence": round(confidence, 2),
            "details": {
                "totalFrames": total_frames,
                "eyeContactFrames": eye_contact_frames,
                "faceDetectionRate": round(face_detection_rate, 2)
            }
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Video path required"}))
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    if not os.path.exists(video_path):
        print(json.dumps({"error": f"Video file not found: {video_path}"}))
        sys.exit(1)
    
    try:
        analyzer = EyeContactAnalyzer()
        result = analyzer.analyze_video(video_path, sample_fps=8)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "error": f"Analysis failed: {str(e)}",
            "score": 0,
            "confidence": 0.0,
            "details": {
                "totalFrames": 0,
                "eyeContactFrames": 0,
                "faceDetectionRate": 0.0
            }
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
