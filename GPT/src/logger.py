import datetime
import cv2

def log_event(act, confidence, frame=None):
    time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open("logs/unsafe_log.csv", "a") as f:
        f.write(f"{time},{act},{round(confidence,2)}\n")

    if frame is not None:
        filename = f"logs/screenshots/{time.replace(':','-')}_{act}.jpg"
        cv2.imwrite(filename, frame)
