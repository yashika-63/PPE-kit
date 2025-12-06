import os
import cv2
import pickle
import face_recognition

KNOWN_DIR = "data/known_faces"

known_encodings = []
known_names = []

for person in os.listdir(KNOWN_DIR):
    person_dir = os.path.join(KNOWN_DIR, person)
    for img in os.listdir(person_dir):
        img_path = os.path.join(person_dir, img)
        image = cv2.imread(img_path)
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        enc = face_recognition.face_encodings(rgb)
        if enc:
            known_encodings.append(enc[0])
            known_names.append(person)

with open("app/database/face_db.pkl", "wb") as f:
    pickle.dump((known_encodings, known_names), f)

print("✅ Training complete!")
