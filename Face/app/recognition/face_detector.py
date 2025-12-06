import cv2
from mtcnn import MTCNN

detector = MTCNN()

def detect_faces(image):
    faces = detector.detect_faces(image)
    face_boxes = []

    for result in faces:
        x, y, w, h = result['box']
        face_boxes.append((x, y, x+w, y+h))

    return face_boxes
