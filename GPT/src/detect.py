from ultralytics import YOLO
import cv2
from logger import log_event

model = YOLO("models/best.pt")

cap = cv2.VideoCapture("test_video.mp4")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame)

    for box in results[0].boxes:
        cls = int(box.cls[0])
        conf = float(box.conf[0])

        if conf > 0.6:
            act = model.names[cls]
            log_event(act, conf)

    annotated = results[0].plot()
    cv2.imshow("Unsafe Detection", annotated)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
