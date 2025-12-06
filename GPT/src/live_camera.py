from ultralytics import YOLO
import cv2
from logger import log_event

# RTSP example:
url = "rtsp://user:password@192.168.1.10:554/stream"

cap = cv2.VideoCapture(url)
model = YOLO("models/best.pt")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame)

    for box in results[0].boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])

        if conf > 0.7:
            act = model.names[cls_id]
            log_event(act, conf)

    frame = results[0].plot()
    cv2.imshow("Live Safety Monitoring", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break
