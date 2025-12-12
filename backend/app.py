from flask import Flask, Response, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import os
import base64
import numpy as np
from datetime import datetime
import pandas as pd
from threading import Lock
import json
from io import BytesIO
from collections import Counter

app = Flask(__name__)
CORS(app)

# Global variables
model = YOLO("best.pt")
camera = None
camera_lock = Lock()
is_streaming = False
detection_filter = "all"  # Options: "all", "helmet", "mask", "vest", "no-helmet", "no-mask", "no-vest"

# Directories
os.makedirs("snapshots", exist_ok=True)
os.makedirs("logs", exist_ok=True)

# Log file
log_file = "logs/detections_log.csv"
if not os.path.exists(log_file):
    pd.DataFrame(columns=["Timestamp", "Snapshot", "Class", "Confidence"]).to_csv(log_file, index=False)

# Class mapping for filtering
CLASS_MAPPING = {
    "helmet": ["helmet", "hard hat"],
    "mask": ["mask", "face mask"],
    "vest": ["vest", "safety vest", "jacket"],
    "no-helmet": ["no helmet", "no hard hat"],
    "no-mask": ["no mask"],
    "no-vest": ["no vest", "no safety vest"]
}

def should_detect_class(class_name, filter_mode):
    """Check if class should be detected based on current filter"""
    if filter_mode == "all":
        return True
    
    class_lower = class_name.lower()
    if filter_mode in CLASS_MAPPING:
        return any(keyword in class_lower for keyword in CLASS_MAPPING[filter_mode])
    return False

def generate_frames():
    """Generate video frames with YOLO detection"""
    global camera, is_streaming, detection_filter
    
    while is_streaming:
        with camera_lock:
            if camera is None or not camera.isOpened():
                break
                
            success, frame = camera.read()
            if not success:
                break
        
        # Run YOLO prediction
        results = model.predict(source=frame, conf=0.5, verbose=False)
        
        # Filter detections based on current filter
        if detection_filter != "all":
            filtered_boxes = []
            detections = results[0].boxes
            
            if detections is not None:
                for i, cls_id in enumerate(detections.cls):
                    class_name = model.names[int(cls_id)]
                    if should_detect_class(class_name, detection_filter):
                        filtered_boxes.append(i)
            
            # Create new result with filtered boxes
            if filtered_boxes:
                results[0].boxes = detections[filtered_boxes]
            else:
                results[0].boxes = None
        
        # Annotate frame
        annotated_frame = results[0].plot()
        
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/api/start-camera', methods=['POST'])
def start_camera():
    """Start camera streaming"""
    global camera, is_streaming
    
    with camera_lock:
        if camera is None or not camera.isOpened():
            camera = cv2.VideoCapture(0)
            if not camera.isOpened():
                return jsonify({"error": "Failed to open camera"}), 500
        
        is_streaming = True
    
    return jsonify({"status": "Camera started"})

@app.route('/api/stop-camera', methods=['POST'])
def stop_camera():
    """Stop camera streaming"""
    global camera, is_streaming
    
    is_streaming = False
    
    with camera_lock:
        if camera is not None:
            camera.release()
            camera = None
    
    return jsonify({"status": "Camera stopped"})

@app.route('/api/video-feed')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/set-filter', methods=['POST'])
def set_filter():
    """Set detection filter"""
    global detection_filter
    
    data = request.json
    filter_mode = data.get('filter', 'all')
    
    valid_filters = ["all", "helmet", "mask", "vest", "no-helmet", "no-mask", "no-vest"]
    if filter_mode not in valid_filters:
        return jsonify({"error": "Invalid filter"}), 400
    
    detection_filter = filter_mode
    return jsonify({"status": f"Filter set to {filter_mode}"})

@app.route('/api/capture-snapshot', methods=['POST'])
def capture_snapshot():
    """Capture and save snapshot with detections"""
    global camera
    
    with camera_lock:
        if camera is None or not camera.isOpened():
            return jsonify({"error": "Camera not active"}), 400
        
        success, frame = camera.read()
        if not success:
            return jsonify({"error": "Failed to capture frame"}), 500
    
    # Run detection
    results = model.predict(source=frame, conf=0.5, verbose=False)
    annotated_frame = results[0].plot()
    
    # Save snapshot
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    snapshot_path = f"snapshots/frame_{timestamp}.jpg"
    cv2.imwrite(snapshot_path, annotated_frame)
    
    # Log detections
    detections = results[0].boxes
    detection_list = []
    
    if detections is not None and detections.cls.numel() > 0:
        rows = []
        for cls_id, conf in zip(detections.cls, detections.conf):
            class_name = model.names[int(cls_id)]
            confidence = float(conf)
            
            detection_list.append({
                "class": class_name,
                "confidence": round(confidence, 3)
            })
            
            rows.append({
                "Timestamp": timestamp,
                "Snapshot": snapshot_path,
                "Class": class_name,
                "Confidence": round(confidence, 3)
            })
        
        # Save to CSV
        pd.DataFrame(rows).to_csv(log_file, mode='a', header=False, index=False)
    
    return jsonify({
        "status": "Snapshot captured",
        "timestamp": timestamp,
        "path": snapshot_path,
        "detections": detection_list
    })

@app.route('/api/get-logs', methods=['GET'])
def get_logs():
    """Get detection logs"""
    if os.path.exists(log_file):
        df = pd.read_csv(log_file)
        return jsonify(df.tail(50).to_dict('records'))
    return jsonify([])

@app.route('/snapshots/<path:filename>')
def serve_snapshot(filename):
    """Serve snapshot images"""
    return send_from_directory('snapshots', filename)

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current system status"""
    return jsonify({
        "is_streaming": is_streaming,
        "detection_filter": detection_filter,
        "camera_active": camera is not None and camera.isOpened() if camera else False
    })

@app.route('/api/export-excel', methods=['GET'])
def export_excel():
    """Export detection logs to Excel file"""
    try:
        if not os.path.exists(log_file):
            return jsonify({"error": "No logs available"}), 404
        
        df = pd.read_csv(log_file)
        
        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Detections', index=False)
            
            # Add summary sheet
            summary_data = {
                'Total Detections': [len(df)],
                'Unique Classes': [df['Class'].nunique()],
                'Date Range': [f"{df['Timestamp'].min()} to {df['Timestamp'].max()}"]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        output.seek(0)
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"PPE_Detection_Log_{timestamp}.xlsx"
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get analytics data for dashboard"""
    try:
        if not os.path.exists(log_file):
            return jsonify({
                "total_detections": 0,
                "class_distribution": {},
                "violation_rate": 0,
                "compliance_rate": 0,
                "detections_by_class": {},
                "recent_trend": [],
                "ppe_statistics": {
                    "helmet": 0,
                    "mask": 0,
                    "vest": 0
                }
            })
        
        df = pd.read_csv(log_file)
        
        if len(df) == 0:
            return jsonify({
                "total_detections": 0,
                "class_distribution": {},
                "violation_rate": 0,
                "compliance_rate": 0,
                "avg_confidence": {},
                "recent_trend": [],
                "ppe_statistics": {
                    "helmet": 0,
                    "mask": 0,
                    "vest": 0
                }
            })
        
        # Class distribution
        class_counts = df['Class'].value_counts().to_dict()
        
        # Violations vs Compliance
        violation_keywords = ['no helmet', 'no mask', 'no vest', 'no hard hat']
        violations = df[df['Class'].str.lower().str.contains('|'.join(violation_keywords), na=False)]
        total_detections = len(df)
        violation_count = len(violations)
        compliance_count = total_detections - violation_count
        
        # Calculate rates
        violation_rate = (violation_count / total_detections * 100) if total_detections > 0 else 0
        compliance_rate = (compliance_count / total_detections * 100) if total_detections > 0 else 0

        # Average confidence by class
        avg_confidence = df.groupby('Class')['Confidence'].mean().to_dict()
        
        # Recent trend (last 10 snapshots)
        # Parse timestamp with custom format
        df['Timestamp'] = pd.to_datetime(df['Timestamp'], format='%Y-%m-%d_%H-%M-%S', errors='coerce')
        df_sorted = df.sort_values('Timestamp', ascending=False)
        unique_snapshots = df_sorted['Snapshot'].unique()[:10]
        recent_data = df_sorted[df_sorted['Snapshot'].isin(unique_snapshots)]
        
        trend = []
        for snapshot in unique_snapshots:
            snapshot_data = recent_data[recent_data['Snapshot'] == snapshot]
            timestamp_val = snapshot_data['Timestamp'].iloc[0]
            # Handle NaT (Not a Time) values
            if pd.isna(timestamp_val):
                time_str = snapshot.split('_')[-1].replace('.jpg', '') if '_' in snapshot else 'N/A'
            else:
                time_str = timestamp_val.strftime('%H:%M:%S')
            
            trend.append({
                'timestamp': time_str,
                'detections': len(snapshot_data),
                'violations': len(snapshot_data[snapshot_data['Class'].str.lower().str.contains('|'.join(violation_keywords), na=False)])
            })
        
        # PPE type statistics
        helmet_count = df[df['Class'].str.lower().str.contains('helmet', na=False)].shape[0]
        mask_count = df[df['Class'].str.lower().str.contains('mask', na=False)].shape[0]
        vest_count = df[df['Class'].str.lower().str.contains('vest|jacket', na=False)].shape[0]
        
        return jsonify({
            "total_detections": total_detections,
            "class_distribution": class_counts,
            "violation_count": violation_count,
            "compliance_count": compliance_count,
            "violation_rate": round(violation_rate, 2),
            "compliance_rate": round(compliance_rate, 2),
            "avg_confidence": avg_confidence,
            "recent_trend": trend,
            "ppe_statistics": {
                "helmet": helmet_count,
                "mask": mask_count,
                "vest": vest_count
            }
        })
    except Exception as e:
        print(f"Analytics Error: {str(e)}")  # Log to console
        import traceback
        traceback.print_exc()  # Print full traceback
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3005, threaded=True)

    #test command